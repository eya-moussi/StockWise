"""Feature extraction for StockWise movement data.

The legacy row-local feature set is preserved exactly. Causal entity-context
features are added only when the input contains ``timestamp``, ``product_id``,
``warehouse_id`` and ``quantity``. Raw causal features are exposed through
``CONTEXTUAL_NUMERIC_FEATURES`` and ``ALL_NUMERIC_FEATURES``. Row-wise,
modeling-safe transformations are exposed separately through
``MODELING_CONTEXTUAL_FEATURES`` so later stages can opt in without silently
changing the existing training/evaluation configuration here.
"""

from bisect import bisect_left, insort
from collections import deque

import numpy as np
import pandas as pd


NUMERIC_FEATURES = [
    "quantity",
    "quantity_ratio",
    "quantity_deviation",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "is_off_hours",
]

CATEGORICAL_FEATURES = ["movement_type"]

OFF_HOURS = [0, 1, 2, 3, 4, 5, 22, 23]

CONTEXT_REQUIRED_COLUMNS = frozenset(
    {"timestamp", "product_id", "warehouse_id", "quantity"}
)

# Causal context features. These are intentionally separate from the legacy
# NUMERIC_FEATURES list so Stage 5D.1 does not silently change the current
# model/evaluation feature configuration.
CONTEXTUAL_NUMERIC_FEATURES = [
    "entity_quantity_ratio",
    "entity_count_1h",
    "entity_gap_minutes",
    "entity_hour_tail_score",
]

ALL_NUMERIC_FEATURES = NUMERIC_FEATURES + CONTEXTUAL_NUMERIC_FEATURES

# Modeling-safe transformations derived from the raw causal context columns.
# These are intentionally separate from CONTEXTUAL_NUMERIC_FEATURES and
# ALL_NUMERIC_FEATURES: they are row-wise, need no fitted parameters, and can be
# used for later Isolation Forest experiments without changing current configs.
MODELING_CONTEXTUAL_FEATURES = [
    "entity_quantity_ratio_log",
    "entity_gap_log",
    "entity_has_prior_history",
]

ENTITY_COUNT_WINDOWS = (15, 30, 60)

MIN_ENTITY_HISTORY = 3

# Bounded rolling median for quantity baselines. O(log W) insertion and O(W)
# memory per entity, avoiding O(n^2) full-history median calculations. The
# window is odd to avoid interpolation and long enough to resist a few extreme
# quantities while still adapting to regime changes.
BASELINE_WINDOW_SIZE = 21

DEFAULT_ENTITY_QUANTITY_RATIO = 1.0
DEFAULT_ENTITY_COUNT = 0.0
NO_PRIOR_GAP_MINUTES = -1.0
DEFAULT_ENTITY_HOUR_TAIL_SCORE = 0.0
MAX_QUANTITY_RATIO = 1e6


def _window_column(minutes):
    """Name a causal count column for a window expressed in minutes."""
    minutes = int(minutes)
    if minutes == 60:
        return "entity_count_1h"
    return f"entity_count_{minutes}m"


def _clean_entity_values(series):
    """Return stripped entity labels and a validity mask."""
    text = series.astype(str).str.strip()
    valid = series.notna().to_numpy() & text.ne("").to_numpy()
    return text.to_numpy(), valid


def _timestamps_to_nanoseconds(values):
    """Return timestamp integers in ns, independent of pandas dtype resolution."""
    timestamps = pd.to_datetime(values, errors="coerce")
    if isinstance(timestamps.dtype, pd.DatetimeTZDtype):
        return timestamps.astype("int64").to_numpy()

    unit = np.datetime_data(timestamps.dtype)[0]
    nanoseconds_per_unit = {
        "ns": 1,
        "us": 1_000,
        "ms": 1_000_000,
        "s": 1_000_000_000,
    }
    if unit not in nanoseconds_per_unit:
        raise TypeError("Unsupported timestamp resolution: {}".format(unit))
    return timestamps.astype("int64").to_numpy() * nanoseconds_per_unit[unit]


def causal_entity_features(data, count_windows=ENTITY_COUNT_WINDOWS):
    """Build causal historical features for product/warehouse entities.

    Definitions
    -----------
    entity_quantity_ratio
        Current quantity divided by the median of the most recent
        ``BASELINE_WINDOW_SIZE`` prior valid quantities for the same
        ``product_id``/``warehouse_id`` pair. At least
        ``MIN_ENTITY_HISTORY`` prior movements are required, the current
        timestamp group is excluded, and duplicate timestamps share the same
        prior-only baseline. Safe default: ``1.0``.

    entity_count_<window>
        Number of prior movements for the same entity in the inclusive-lower,
        exclusive-upper interval ``[current_time - window, current_time)``.
        Rows sharing the current timestamp are never counted as prior. Safe
        default: ``0.0``. The 60-minute column is named ``entity_count_1h``.

    entity_gap_minutes
        Minutes since the strictly earlier timestamp for the same entity. Rows
        with the same timestamp share the previous group's gap. Safe default:
        ``-1.0``, meaning no causally available prior movement. This sentinel
        is retained deliberately and there is no separate history-availability
        column. If these features are fed to a distance-based model, warm-up
        rows share a finite negative value and long gaps remain large; any
        transformation, clipping, or explicit history indicator is a modeling
        decision for a later stage.

    entity_hour_tail_score
        Circular deviation from the entity's historical mean hour, in ``[0, 1]``.
        It is computed as ``0.5 * (1 - cos(delta))`` where ``delta`` is the
        angular difference between the current hour and the mean of prior
        hours. Safe default: ``0.0`` when history is too short or when prior
        hours are too uniformly distributed to define a meaningful mean.

    All baselines exclude the current row and every row with the same
    timestamp. Invalid timestamps, missing entity labels, and non-positive or
    non-finite quantities are excluded from the relevant histories.
    """
    count_windows = tuple(int(minutes) for minutes in count_windows)
    if any(minutes <= 0 for minutes in count_windows):
        raise ValueError("count_windows must contain positive minute values.")

    count_columns = [_window_column(minutes) for minutes in count_windows]
    columns = ["entity_quantity_ratio"] + count_columns + [
        "entity_gap_minutes",
        "entity_hour_tail_score",
    ]

    n_rows = len(data)
    result = {name: np.full(n_rows, default, dtype=float) for name, default in [
        ("entity_quantity_ratio", DEFAULT_ENTITY_QUANTITY_RATIO),
        ("entity_gap_minutes", NO_PRIOR_GAP_MINUTES),
        ("entity_hour_tail_score", DEFAULT_ENTITY_HOUR_TAIL_SCORE),
    ]}
    for column in count_columns:
        result[column] = np.full(n_rows, DEFAULT_ENTITY_COUNT, dtype=float)

    if not CONTEXT_REQUIRED_COLUMNS.issubset(data.columns):
        return pd.DataFrame(result, index=data.index, columns=columns)

    timestamps = pd.to_datetime(data["timestamp"], errors="coerce")
    time_valid = timestamps.notna().to_numpy()

    product_values, product_valid = _clean_entity_values(data["product_id"])
    warehouse_values, warehouse_valid = _clean_entity_values(data["warehouse_id"])

    quantity = pd.to_numeric(data["quantity"], errors="coerce").to_numpy(dtype=float)
    quantity_valid = np.isfinite(quantity) & (quantity > 0)

    context_valid = time_valid & product_valid & warehouse_valid
    positions = np.flatnonzero(context_valid)
    if positions.size == 0:
        return pd.DataFrame(result, index=data.index, columns=columns)

    time_ns = _timestamps_to_nanoseconds(timestamps.iloc[positions])
    hours = timestamps.dt.hour.to_numpy()[positions]
    angles = 2.0 * np.pi * hours / 24.0

    work = pd.DataFrame(
        {
            "position": positions,
            "product": product_values[positions],
            "warehouse": warehouse_values[positions],
            "time_ns": time_ns,
            "quantity": quantity[positions],
            "quantity_valid": quantity_valid[positions],
            "hour_sin": np.sin(angles),
            "hour_cos": np.cos(angles),
        }
    )

    for _, group in work.groupby(["product", "warehouse"], sort=False):
        group = group.sort_values("time_ns", kind="mergesort")
        row_positions = group["position"].to_numpy()
        row_times = group["time_ns"].to_numpy()
        row_quantity = group["quantity"].to_numpy(dtype=float)
        row_quantity_valid = group["quantity_valid"].to_numpy(dtype=bool)

        unique_times, first_indices, group_index, group_sizes = np.unique(
            row_times,
            return_index=True,
            return_inverse=True,
            return_counts=True,
        )
        n_groups = len(unique_times)
        group_numbers = np.arange(n_groups)

        prefix_row_counts = np.concatenate(
            ([0], np.cumsum(group_sizes, dtype=np.int64))
        )
        prior_row_counts = prefix_row_counts[group_numbers]

        for minutes, column in zip(count_windows, count_columns):
            span_ns = int(minutes) * 60 * 1_000_000_000
            left = np.searchsorted(
                unique_times, unique_times - span_ns, side="left"
            )
            counts_by_group = prefix_row_counts[group_numbers] - prefix_row_counts[left]
            result[column][row_positions] = counts_by_group[group_index].astype(float)

        gap_by_group = np.full(n_groups, NO_PRIOR_GAP_MINUTES, dtype=float)
        if n_groups > 1:
            gap_by_group[1:] = (
                unique_times[1:] - unique_times[:-1]
            ) / (60.0 * 1_000_000_000)
        result["entity_gap_minutes"][row_positions] = gap_by_group[group_index]

        valid_rows = np.flatnonzero(row_quantity_valid)
        valid_group_ids = group_index[valid_rows]
        valid_values = row_quantity[valid_rows]
        value_order = np.argsort(valid_group_ids, kind="mergesort")
        valid_group_ids = valid_group_ids[value_order]
        valid_values = valid_values[value_order]

        value_starts = np.searchsorted(
            valid_group_ids, group_numbers, side="left"
        )
        value_ends = np.searchsorted(
            valid_group_ids, group_numbers, side="right"
        )

        baseline_by_group = np.full(n_groups, np.nan, dtype=float)
        history_order = deque()
        sorted_history = []

        for group_number in range(n_groups):
            if len(sorted_history) >= MIN_ENTITY_HISTORY:
                middle = len(sorted_history) // 2
                if len(sorted_history) % 2:
                    baseline = sorted_history[middle]
                else:
                    baseline = (
                        sorted_history[middle - 1] + sorted_history[middle]
                    ) / 2.0
                if baseline > 0:
                    baseline_by_group[group_number] = baseline

            for value in valid_values[
                value_starts[group_number]:value_ends[group_number]
            ]:
                value = float(value)
                history_order.append(value)
                insort(sorted_history, value)
                if len(history_order) > BASELINE_WINDOW_SIZE:
                    oldest = history_order.popleft()
                    oldest_index = bisect_left(sorted_history, oldest)
                    if (
                        oldest_index < len(sorted_history)
                        and sorted_history[oldest_index] == oldest
                    ):
                        sorted_history.pop(oldest_index)

        row_baseline = baseline_by_group[group_index]
        ratio_calculable = (
            row_quantity_valid
            & np.isfinite(row_baseline)
            & (row_baseline > 0)
        )
        ratio_values = np.full(len(row_positions), DEFAULT_ENTITY_QUANTITY_RATIO)
        ratio_values[ratio_calculable] = (
            row_quantity[ratio_calculable] / row_baseline[ratio_calculable]
        )
        ratio_values = np.clip(ratio_values, 0.0, MAX_QUANTITY_RATIO)
        result["entity_quantity_ratio"][row_positions] = ratio_values

        group_hour_sin = group["hour_sin"].to_numpy()[first_indices]
        group_hour_cos = group["hour_cos"].to_numpy()[first_indices]
        prefix_sin = np.concatenate(([0], np.cumsum(group_hour_sin)))
        prefix_cos = np.concatenate(([0], np.cumsum(group_hour_cos)))

        mean_sin = prefix_sin[group_numbers] / np.maximum(prior_row_counts, 1)
        mean_cos = prefix_cos[group_numbers] / np.maximum(prior_row_counts, 1)
        mean_length = np.hypot(mean_sin, mean_cos)

        row_mean_sin = mean_sin[group_index]
        row_mean_cos = mean_cos[group_index]
        row_mean_length = mean_length[group_index]
        prior_hours_ok = (
            prior_row_counts[group_index] >= MIN_ENTITY_HISTORY
        ) & (row_mean_length > 1e-6)

        dot = (
            group["hour_sin"].to_numpy() * row_mean_sin
            + group["hour_cos"].to_numpy() * row_mean_cos
        )
        cos_delta = np.clip(dot / np.maximum(row_mean_length, 1e-12), -1.0, 1.0)
        tail_values = np.full(
            len(row_positions), DEFAULT_ENTITY_HOUR_TAIL_SCORE, dtype=float
        )
        tail_values[prior_hours_ok] = 0.5 * (1.0 - cos_delta[prior_hours_ok])
        result["entity_hour_tail_score"][row_positions] = np.clip(
            tail_values, 0.0, 1.0
        )

    return pd.DataFrame(result, index=data.index, columns=columns)


def modeling_safe_context_features(data):
    """Derive modeling-safe features from raw causal context columns.

    Transformations
    ---------------
    entity_quantity_ratio_log
        ``log(entity_quantity_ratio)`` for positive, finite ratios. Invalid or
        non-positive ratios fall back to ``log(DEFAULT_ENTITY_QUANTITY_RATIO)``,
        which is ``0.0``. No fitted parameters or clipping thresholds are used.
        The raw ``entity_quantity_ratio`` remains unchanged.

    entity_gap_log
        ``log1p(entity_gap_minutes)`` for finite gaps greater than or equal to
        zero. The no-history sentinel ``-1.0`` is preserved, and any invalid or
        non-finite gap also uses that sentinel. Large positive gaps are not
        clipped. The raw ``entity_gap_minutes`` remains unchanged.

    entity_has_prior_history
        ``1`` when ``entity_gap_minutes`` is finite and greater than or equal
        to zero, otherwise ``0``. This is an experimental feature and is kept
        out of the recommended core numeric list.
    """
    n_rows = len(data)

    if "entity_quantity_ratio" in data.columns:
        ratio = pd.to_numeric(
            data["entity_quantity_ratio"], errors="coerce"
        ).to_numpy(dtype=float)
    else:
        ratio = np.full(n_rows, DEFAULT_ENTITY_QUANTITY_RATIO, dtype=float)

    if "entity_gap_minutes" in data.columns:
        gap = pd.to_numeric(
            data["entity_gap_minutes"], errors="coerce"
        ).to_numpy(dtype=float)
    else:
        gap = np.full(n_rows, NO_PRIOR_GAP_MINUTES, dtype=float)

    ratio_positive = np.isfinite(ratio) & (ratio > 0)
    ratio_log = np.zeros(n_rows, dtype=float)
    ratio_log[ratio_positive] = np.log(ratio[ratio_positive])

    has_history = np.isfinite(gap) & (gap >= 0)
    gap_log = np.full(n_rows, NO_PRIOR_GAP_MINUTES, dtype=float)
    gap_log[has_history] = np.log1p(gap[has_history])

    return pd.DataFrame(
        {
            "entity_quantity_ratio_log": ratio_log,
            "entity_gap_log": gap_log,
            "entity_has_prior_history": has_history.astype(np.int8),
        },
        index=data.index,
        columns=MODELING_CONTEXTUAL_FEATURES,
    )


def build_features(data):
    """Add row-local features and, when available, causal entity context."""
    data["hour_sin"] = np.sin(2 * np.pi * data["hour"] / 24)
    data["hour_cos"] = np.cos(2 * np.pi * data["hour"] / 24)

    data["day_sin"] = np.sin(2 * np.pi * data["day_of_week"] / 7)
    data["day_cos"] = np.cos(2 * np.pi * data["day_of_week"] / 7)

    data["is_off_hours"] = data["hour"].isin(OFF_HOURS).astype(int)

    data["quantity_deviation"] = np.abs(
        np.log(data["quantity_ratio"].clip(lower=1e-6))
    )

    if CONTEXT_REQUIRED_COLUMNS.issubset(data.columns):
        context = causal_entity_features(data, count_windows=(60,))
        for column in CONTEXTUAL_NUMERIC_FEATURES:
            data[column] = context[column].to_numpy()

        modeling_context = modeling_safe_context_features(data)
        for column in MODELING_CONTEXTUAL_FEATURES:
            data[column] = modeling_context[column].to_numpy()

    return data
