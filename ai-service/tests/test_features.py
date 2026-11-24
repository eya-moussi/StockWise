import importlib.util
import sys
from pathlib import Path

import numpy as np
import pandas as pd


AI_SERVICE_DIR = Path(__file__).resolve().parents[1]
FEATURES_PATH = AI_SERVICE_DIR / "features.py"
TRAIN_IFC_PATH = AI_SERVICE_DIR / "train_ifc.py"


def _load_module(module_name, path):
    if str(AI_SERVICE_DIR) not in sys.path:
        sys.path.insert(0, str(AI_SERVICE_DIR))
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _feature_fixture():
    return pd.DataFrame(
        {
            "hour": [0, 6, 10, 22, 23],
            "day_of_week": [0, 1, 3, 6, 2],
            "quantity_ratio": [1.0, 2.0, 0.5, 1e-7, 0.0],
        }
    )


def _context_fixture():
    return pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 09:00:00",
                    "2026-01-01 09:10:00",
                    "2026-01-01 09:20:00",
                    "2026-01-01 09:30:00",
                ]
            ),
            "product_id": ["P1", "P1", "P1", "P1"],
            "warehouse_id": ["W1", "W1", "W1", "W1"],
            "quantity": [10, 20, 30, 60],
        }
    )


def _context_ready_fixture():
    data = _context_fixture()
    data["movement_type"] = ["IN"] * len(data)
    data["hour"] = data["timestamp"].dt.hour
    data["day_of_week"] = data["timestamp"].dt.dayofweek
    data["quantity_ratio"] = [1.0, 1.0, 1.0, 2.0]
    return data


def test_feature_columns_unchanged():
    features = _load_module("features_columns_probe", FEATURES_PATH)

    assert features.NUMERIC_FEATURES == [
        "quantity",
        "quantity_ratio",
        "quantity_deviation",
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos",
        "is_off_hours",
    ]
    assert features.CATEGORICAL_FEATURES == ["movement_type"]
    assert features.OFF_HOURS == [0, 1, 2, 3, 4, 5, 22, 23]

    assert features.CONTEXTUAL_NUMERIC_FEATURES == [
        "entity_quantity_ratio",
        "entity_count_1h",
        "entity_gap_minutes",
        "entity_hour_tail_score",
    ]
    assert features.ALL_NUMERIC_FEATURES == (
        features.NUMERIC_FEATURES + features.CONTEXTUAL_NUMERIC_FEATURES
    )
    assert features.MODELING_CONTEXTUAL_FEATURES == [
        "entity_quantity_ratio_log",
        "entity_gap_log",
        "entity_has_prior_history",
    ]
    assert features.ENTITY_COUNT_WINDOWS == (15, 30, 60)
    assert features.BASELINE_WINDOW_SIZE == 21


def test_build_features_matches_original_calculations():
    features = _load_module("features_calculation_probe", FEATURES_PATH)
    data = _feature_fixture()

    expected = data.copy()
    expected["hour_sin"] = np.sin(2 * np.pi * data["hour"] / 24)
    expected["hour_cos"] = np.cos(2 * np.pi * data["hour"] / 24)
    expected["day_sin"] = np.sin(2 * np.pi * data["day_of_week"] / 7)
    expected["day_cos"] = np.cos(2 * np.pi * data["day_of_week"] / 7)
    expected["is_off_hours"] = data["hour"].isin([0, 1, 2, 3, 4, 5, 22, 23]).astype(int)
    expected["quantity_deviation"] = np.abs(
        np.log(data["quantity_ratio"].clip(lower=1e-6))
    )

    result = features.build_features(data.copy())

    pd.testing.assert_frame_equal(result, expected)
    assert not any(column.startswith("entity_") for column in result.columns)


def test_build_features_mutates_input_frame():
    features = _load_module("features_mutation_probe", FEATURES_PATH)
    data = _feature_fixture()

    result = features.build_features(data)

    assert result is data
    assert "hour_sin" in data.columns
    assert "quantity_deviation" in data.columns


def test_train_ifc_uses_extracted_feature_module():
    features = _load_module("features", FEATURES_PATH)
    train_ifc = _load_module("train_ifc_feature_probe", TRAIN_IFC_PATH)

    assert train_ifc.build_features is features.build_features
    assert train_ifc.NUMERIC_FEATURES == features.NUMERIC_FEATURES
    assert train_ifc.CATEGORICAL_FEATURES == features.CATEGORICAL_FEATURES
    assert train_ifc.OFF_HOURS == features.OFF_HOURS


def test_causal_features_return_safe_defaults_without_context():
    features = _load_module("features_default_probe", FEATURES_PATH)
    data = pd.DataFrame({"quantity": [1, 2, 3]})

    result = features.causal_entity_features(data, count_windows=(60,))

    assert result.columns.tolist() == [
        "entity_quantity_ratio",
        "entity_count_1h",
        "entity_gap_minutes",
        "entity_hour_tail_score",
    ]
    assert result["entity_quantity_ratio"].eq(1.0).all()
    assert result["entity_count_1h"].eq(0.0).all()
    assert result["entity_gap_minutes"].eq(-1.0).all()
    assert result["entity_hour_tail_score"].eq(0.0).all()


def test_quantity_ratio_uses_only_prior_entity_history():
    features = _load_module("features_quantity_context_probe", FEATURES_PATH)
    data = _context_fixture()

    result = features.causal_entity_features(data, count_windows=(60,))

    np.testing.assert_allclose(
        result["entity_quantity_ratio"].to_numpy(),
        [1.0, 1.0, 1.0, 3.0],
    )


def test_current_movement_is_excluded_from_historical_baseline():
    features = _load_module("features_current_exclusion_probe", FEATURES_PATH)
    data = _context_fixture()
    data.loc[3, "quantity"] = 20
    future = data.loc[[3]].copy()
    future["timestamp"] = pd.to_datetime(["2026-01-01 09:40:00"])
    future["quantity"] = [1000]
    data = pd.concat([data, future], ignore_index=True)

    result = features.causal_entity_features(data, count_windows=(60,))

    # At 09:40 the prior quantities are 10, 20, 30 and 20 (mean 20).
    assert result.loc[4, "entity_quantity_ratio"] == 50.0


def test_entity_count_windows_15_30_and_60_minutes():
    features = _load_module("features_count_windows_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 00:00:00",
                    "2026-01-01 00:50:00",
                    "2026-01-01 01:00:00",
                    "2026-01-01 01:10:00",
                ]
            ),
            "product_id": ["P1"] * 4,
            "warehouse_id": ["W1"] * 4,
            "quantity": [1, 1, 1, 1],
        }
    )

    result = features.causal_entity_features(
        data, count_windows=features.ENTITY_COUNT_WINDOWS
    )

    np.testing.assert_array_equal(
        result["entity_count_15m"].to_numpy(), [0, 0, 1, 1]
    )
    np.testing.assert_array_equal(
        result["entity_count_30m"].to_numpy(), [0, 0, 1, 2]
    )
    np.testing.assert_array_equal(
        result["entity_count_1h"].to_numpy(), [0, 1, 2, 2]
    )


def test_entity_gap_minutes_uses_previous_entity_timestamp():
    features = _load_module("features_gap_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 00:00:00",
                    "2026-01-01 00:10:00",
                    "2026-01-01 00:45:00",
                ]
            ),
            "product_id": ["P1"] * 3,
            "warehouse_id": ["W1"] * 3,
            "quantity": [1, 1, 1],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))

    np.testing.assert_allclose(
        result["entity_gap_minutes"].to_numpy(), [-1.0, 10.0, 35.0]
    )


def test_hour_tail_score_uses_only_entity_history():
    features = _load_module("features_hour_tail_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 10:00:00",
                    "2026-01-01 10:05:00",
                    "2026-01-01 10:10:00",
                    "2026-01-01 10:15:00",
                    "2026-01-01 22:00:00",
                ]
            ),
            "product_id": ["P1"] * 5,
            "warehouse_id": ["W1"] * 5,
            "quantity": [1, 1, 1, 1, 1],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))

    assert result.loc[0:2, "entity_hour_tail_score"].eq(0.0).all()
    assert result.loc[3, "entity_hour_tail_score"] < 0.01
    assert result.loc[4, "entity_hour_tail_score"] > 0.95


def test_duplicate_timestamps_use_strictly_prior_history():
    features = _load_module("features_duplicate_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 09:00:00",
                    "2026-01-01 09:10:00",
                    "2026-01-01 09:10:00",
                    "2026-01-01 09:20:00",
                ]
            ),
            "product_id": ["P1"] * 4,
            "warehouse_id": ["W1"] * 4,
            "quantity": [10, 20, 200, 30],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))

    np.testing.assert_array_equal(
        result["entity_count_1h"].to_numpy(), [0, 1, 1, 3]
    )
    np.testing.assert_allclose(
        result["entity_gap_minutes"].to_numpy(), [-1.0, 10.0, 10.0, 10.0]
    )
    assert result.loc[1].equals(result.loc[2])
    np.testing.assert_allclose(result.loc[3, "entity_quantity_ratio"], 30.0 / 20.0)


def test_unsorted_input_matches_sorted_features():
    features = _load_module("features_unsorted_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 08:00:00",
                    "2026-01-01 08:10:00",
                    "2026-01-01 08:20:00",
                    "2026-01-01 08:30:00",
                ]
            ),
            "product_id": ["P1", "P2", "P1", "P2"],
            "warehouse_id": ["W1", "W1", "W1", "W1"],
            "quantity": [10, 100, 20, 200],
        }
    )

    expected = features.causal_entity_features(
        data, count_windows=features.ENTITY_COUNT_WINDOWS
    )
    shuffled = data.iloc[[2, 0, 3, 1]].copy()
    actual = features.causal_entity_features(
        shuffled, count_windows=features.ENTITY_COUNT_WINDOWS
    )

    pd.testing.assert_frame_equal(actual.sort_index(), expected.sort_index())


def test_future_rows_do_not_change_earlier_features():
    features = _load_module("features_future_probe", FEATURES_PATH)
    base = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 10:00:00",
                    "2026-01-01 10:05:00",
                    "2026-01-01 10:10:00",
                    "2026-01-01 10:15:00",
                ]
            ),
            "product_id": ["P1"] * 4,
            "warehouse_id": ["W1"] * 4,
            "quantity": [10, 20, 30, 40],
        }
    )
    future = base.loc[[3]].copy()
    future["timestamp"] = pd.to_datetime(["2026-01-01 11:00:00"])
    future["quantity"] = [999999]
    full = pd.concat([base, future], ignore_index=True)

    base_features = features.causal_entity_features(
        base, count_windows=features.ENTITY_COUNT_WINDOWS
    )
    full_features = features.causal_entity_features(
        full, count_windows=features.ENTITY_COUNT_WINDOWS
    )

    pd.testing.assert_frame_equal(
        full_features.loc[base.index], base_features
    )


def test_entity_isolation_across_product_and_warehouse():
    features = _load_module("features_isolation_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 10:00:00",
                    "2026-01-01 10:01:00",
                    "2026-01-01 10:02:00",
                    "2026-01-01 10:03:00",
                    "2026-01-01 10:04:00",
                    "2026-01-01 10:05:00",
                    "2026-01-01 10:06:00",
                    "2026-01-01 10:07:00",
                ]
            ),
            "product_id": ["P1", "P2", "P1", "P2", "P1", "P2", "P1", "P2"],
            "warehouse_id": ["W1"] * 8,
            "quantity": [10, 1000, 10, 1000, 10, 1000, 20, 1000],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))

    np.testing.assert_allclose(result.loc[6, "entity_quantity_ratio"], 2.0)
    np.testing.assert_allclose(result.loc[7, "entity_quantity_ratio"], 1.0)
    np.testing.assert_array_equal(
        result["entity_count_1h"].to_numpy(), [0, 0, 1, 1, 2, 2, 3, 3]
    )


def test_invalid_context_and_quantities_use_safe_defaults():
    features = _load_module("features_invalid_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": [
                "2026-01-01 10:00:00",
                "2026-01-01 10:05:00",
                "2026-01-01 10:10:00",
                "2026-01-01 10:11:00",
                "not-a-date",
                "2026-01-01 10:12:00",
                "2026-01-01 10:15:00",
            ],
            "product_id": ["P1", "P1", "P1", None, "P1", "P1", "P1"],
            "warehouse_id": ["W1"] * 7,
            "quantity": [10, 20, 30, 9999, 9999, -5, 40],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))

    for row in [3, 4]:
        assert result.loc[row, "entity_quantity_ratio"] == 1.0
        assert result.loc[row, "entity_count_1h"] == 0.0
        assert result.loc[row, "entity_gap_minutes"] == -1.0
        assert result.loc[row, "entity_hour_tail_score"] == 0.0

    assert result.loc[5, "entity_quantity_ratio"] == 1.0
    np.testing.assert_allclose(result.loc[6, "entity_quantity_ratio"], 2.0)


def test_context_features_do_not_use_labels_or_scenario_columns():
    features = _load_module("features_label_probe", FEATURES_PATH)
    data = _context_fixture()
    data["is_anomaly"] = [0, 1, 0, 1]
    data["anomaly_kind"] = ["none", "timing", "none", "combined"]

    changed = data.copy()
    changed["is_anomaly"] = 1 - changed["is_anomaly"]
    changed["anomaly_kind"] = ["changed"] * len(changed)
    changed["scenario"] = ["changed"] * len(changed)

    first = features.causal_entity_features(
        data, count_windows=features.ENTITY_COUNT_WINDOWS
    )
    second = features.causal_entity_features(
        changed, count_windows=features.ENTITY_COUNT_WINDOWS
    )

    pd.testing.assert_frame_equal(first, second)


def test_build_features_adds_context_columns_when_available():
    features = _load_module("features_context_build_probe", FEATURES_PATH)
    data = _context_fixture()
    data["movement_type"] = ["IN"] * 4
    data["hour"] = data["timestamp"].dt.hour
    data["day_of_week"] = data["timestamp"].dt.dayofweek
    data["quantity_ratio"] = [1.0, 1.0, 1.0, 2.0]

    result = features.build_features(data)

    assert result is data
    assert all(column in result.columns for column in features.CONTEXTUAL_NUMERIC_FEATURES)
    assert all(column in result.columns for column in features.MODELING_CONTEXTUAL_FEATURES)
    np.testing.assert_allclose(
        result["entity_quantity_ratio"].to_numpy(), [1.0, 1.0, 1.0, 3.0]
    )
    np.testing.assert_allclose(
        result["entity_quantity_ratio_log"].to_numpy(), [0.0, 0.0, 0.0, np.log(3.0)]
    )
    np.testing.assert_allclose(
        result["entity_gap_log"].to_numpy(),
        [features.NO_PRIOR_GAP_MINUTES, np.log1p(10.0), np.log1p(10.0), np.log1p(10.0)],
    )
    np.testing.assert_array_equal(
        result["entity_has_prior_history"].to_numpy(), [0, 1, 1, 1]
    )


def test_context_features_are_deterministic():
    features = _load_module("features_deterministic_probe", FEATURES_PATH)
    data = _context_fixture()

    first = features.causal_entity_features(
        data, count_windows=features.ENTITY_COUNT_WINDOWS
    )
    second = features.causal_entity_features(
        data.copy(), count_windows=features.ENTITY_COUNT_WINDOWS
    )

    pd.testing.assert_frame_equal(first, second)


def test_extreme_historical_quantity_does_not_distort_baseline():
    features = _load_module("features_robust_baseline_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 10:00:00",
                    "2026-01-01 10:10:00",
                    "2026-01-01 10:20:00",
                    "2026-01-01 10:30:00",
                ]
            ),
            "product_id": ["P1"] * 4,
            "warehouse_id": ["W1"] * 4,
            "quantity": [10, 10, 1_000_000, 10],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))

    # Median history is 10; the extreme prior quantity must not dominate.
    np.testing.assert_allclose(result.loc[3, "entity_quantity_ratio"], 1.0)


def test_midnight_hours_are_circularly_close():
    features = _load_module("features_midnight_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(
                [
                    "2026-01-01 23:00:00",
                    "2026-01-02 00:00:00",
                    "2026-01-02 01:00:00",
                    "2026-01-02 23:30:00",
                    "2026-01-03 01:30:00",
                    "2026-01-03 12:00:00",
                ]
            ),
            "product_id": ["P1"] * 6,
            "warehouse_id": ["W1"] * 6,
            "quantity": [1] * 6,
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))
    tail = result["entity_hour_tail_score"]

    assert tail.loc[3] < 0.05
    assert tail.loc[4] < 0.05
    assert tail.loc[5] > 0.95


def test_empty_input_returns_empty_context_frame():
    features = _load_module("features_empty_probe", FEATURES_PATH)
    data = pd.DataFrame(columns=["timestamp", "product_id", "warehouse_id", "quantity"])

    result = features.causal_entity_features(
        data, count_windows=features.ENTITY_COUNT_WINDOWS
    )

    assert result.empty
    assert result.columns.tolist() == [
        "entity_quantity_ratio",
        "entity_count_15m",
        "entity_count_30m",
        "entity_count_1h",
        "entity_gap_minutes",
        "entity_hour_tail_score",
    ]
    assert all(pd.api.types.is_float_dtype(result[column]) for column in result.columns)


def test_very_long_gap_is_not_clipped():
    features = _load_module("features_long_gap_probe", FEATURES_PATH)
    start = pd.Timestamp("2020-01-01 00:00:00")
    end = pd.Timestamp("2025-01-01 00:00:00")
    data = pd.DataFrame(
        {
            "timestamp": [start, end],
            "product_id": ["P1", "P1"],
            "warehouse_id": ["W1", "W1"],
            "quantity": [10, 20],
        }
    )

    result = features.causal_entity_features(data, count_windows=(60,))
    expected = (end - start).total_seconds() / 60.0

    np.testing.assert_allclose(result.loc[1, "entity_gap_minutes"], expected)
    assert result.loc[1, "entity_gap_minutes"] > 1_000_000


def test_modeling_features_log_positive_quantity_ratios():
    features = _load_module("features_ratio_log_probe", FEATURES_PATH)
    ratios = [0.25, 1.0, 4.0, features.MAX_QUANTITY_RATIO]
    data = pd.DataFrame({"entity_quantity_ratio": ratios})

    result = features.modeling_safe_context_features(data)

    assert result.columns.tolist() == features.MODELING_CONTEXTUAL_FEATURES
    np.testing.assert_allclose(
        result["entity_quantity_ratio_log"].to_numpy(), np.log(ratios)
    )
    assert np.isfinite(result["entity_quantity_ratio_log"].to_numpy()).all()


def test_modeling_features_log_gap_and_history_indicator():
    features = _load_module("features_gap_log_probe", FEATURES_PATH)
    gaps = [-1.0, 0.0, 10.0, 1e12, np.nan, -5.0, np.inf]
    data = pd.DataFrame({"entity_gap_minutes": gaps})

    result = features.modeling_safe_context_features(data)

    expected_gap_log = [
        features.NO_PRIOR_GAP_MINUTES,
        np.log1p(0.0),
        np.log1p(10.0),
        np.log1p(1e12),
        features.NO_PRIOR_GAP_MINUTES,
        features.NO_PRIOR_GAP_MINUTES,
        features.NO_PRIOR_GAP_MINUTES,
    ]
    np.testing.assert_allclose(result["entity_gap_log"].to_numpy(), expected_gap_log)
    np.testing.assert_array_equal(
        result["entity_has_prior_history"].to_numpy(), [0, 1, 1, 1, 0, 0, 0]
    )
    assert np.isfinite(result.to_numpy(dtype=float)).all()


def test_modeling_features_invalid_ratio_and_missing_columns_use_defaults():
    features = _load_module("features_invalid_transform_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "entity_quantity_ratio": [np.nan, 0.0, -1.0, np.inf, 2.0],
            "entity_gap_minutes": [-1.0, -1.0, -1.0, -1.0, 5.0],
        }
    )

    result = features.modeling_safe_context_features(data)

    np.testing.assert_allclose(
        result["entity_quantity_ratio_log"].to_numpy(),
        [0.0, 0.0, 0.0, 0.0, np.log(2.0)],
    )
    np.testing.assert_allclose(
        result["entity_gap_log"].to_numpy(),
        [features.NO_PRIOR_GAP_MINUTES] * 4 + [np.log1p(5.0)],
    )

    missing = pd.DataFrame(index=[10, 11])
    defaults = features.modeling_safe_context_features(missing)

    assert defaults.index.tolist() == [10, 11]
    assert defaults.columns.tolist() == features.MODELING_CONTEXTUAL_FEATURES
    np.testing.assert_allclose(defaults["entity_quantity_ratio_log"], [0.0, 0.0])
    np.testing.assert_allclose(
        defaults["entity_gap_log"],
        [features.NO_PRIOR_GAP_MINUTES, features.NO_PRIOR_GAP_MINUTES],
    )
    np.testing.assert_array_equal(defaults["entity_has_prior_history"], [0, 0])


def test_modeling_features_empty_input():
    features = _load_module("features_empty_transform_probe", FEATURES_PATH)
    data = pd.DataFrame(columns=["entity_quantity_ratio", "entity_gap_minutes"])

    result = features.modeling_safe_context_features(data)

    assert result.empty
    assert result.columns.tolist() == features.MODELING_CONTEXTUAL_FEATURES


def test_modeling_features_are_deterministic():
    features = _load_module("features_deterministic_transform_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "entity_quantity_ratio": [0.5, 2.0, 10.0],
            "entity_gap_minutes": [-1.0, 0.0, 3600.0],
        }
    )

    first = features.modeling_safe_context_features(data)
    second = features.modeling_safe_context_features(data.copy())

    pd.testing.assert_frame_equal(first, second)


def test_modeling_features_do_not_use_labels_or_scenario_columns():
    features = _load_module("features_transform_label_probe", FEATURES_PATH)
    data = pd.DataFrame(
        {
            "entity_quantity_ratio": [2.0, 4.0],
            "entity_gap_minutes": [10.0, -1.0],
            "is_anomaly": [0, 0],
            "anomaly_kind": ["none", "none"],
            "scenario": ["normal", "normal"],
        }
    )
    changed = data.copy()
    changed["is_anomaly"] = [1, 1]
    changed["anomaly_kind"] = ["quantity", "timing"]
    changed["scenario"] = ["changed", "changed"]

    first = features.modeling_safe_context_features(data)
    second = features.modeling_safe_context_features(changed)

    pd.testing.assert_frame_equal(first, second)


def test_modeling_features_preserve_future_row_invariance():
    features = _load_module("features_future_transform_probe", FEATURES_PATH)
    base = _context_ready_fixture()
    base["is_anomaly"] = [0, 0, 1, 0]
    base["anomaly_kind"] = ["none", "none", "timing", "none"]

    future = base.loc[[3]].copy()
    future["timestamp"] = pd.to_datetime(["2026-01-01 10:00:00"])
    future["product_id"] = ["P2"]
    future["warehouse_id"] = ["W2"]
    future["quantity"] = [999999]
    future["is_anomaly"] = [1]
    future["anomaly_kind"] = ["combined"]
    full = pd.concat([base, future], ignore_index=True)

    base_result = features.build_features(base.copy())
    full_result = features.build_features(full.copy())

    np.testing.assert_allclose(
        full_result.loc[3, "entity_gap_log"],
        np.log1p(10.0),
    )
    for column in features.MODELING_CONTEXTUAL_FEATURES:
        pd.testing.assert_series_equal(
            full_result.loc[base.index, column], base_result[column]
        )
