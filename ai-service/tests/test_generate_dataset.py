import copy
import hashlib
import importlib.util
import sys
from pathlib import Path

import numpy as np
import pandas as pd


AI_SERVICE_DIR = Path(__file__).resolve().parents[1]
GENERATE_DATASET_PATH = AI_SERVICE_DIR / "generate_dataset.py"
EXISTING_CSV = AI_SERVICE_DIR / "data" / "ifc_synthetic_dataset.csv"
LEGACY_CSV = AI_SERVICE_DIR / "data" / "ifc_synthetic_dataset_v1.csv"
MODEL_ARTIFACT = AI_SERVICE_DIR / "models" / "isolation_forest.joblib"

AUDIT_SEEDS = (42, 43, 44, 101, 202, 303)
CONFOUND_SEEDS = (42, 43, 44)


def _load_module(module_name):
    spec = importlib.util.spec_from_file_location(
        module_name, GENERATE_DATASET_PATH
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class _RecordingRNG:
    """Delegate to NumPy while recording which sampling probabilities are used."""

    def __init__(self, seed, module):
        self._rng = np.random.default_rng(seed)
        self._movement_types = list(module.MOVEMENT_TYPES)
        self._product_ids = list(module.PRODUCT_IDS)
        self._warehouse_ids = list(module.WAREHOUSE_IDS)
        self.movement_type_choices = []
        self.product_choices = []
        self.warehouse_choices = []

    def choice(self, a, size=None, replace=True, p=None):
        try:
            values = list(a)
        except TypeError:
            values = a

        if values == self._movement_types:
            self.movement_type_choices.append(p)
        if values == self._product_ids:
            self.product_choices.append(p)
        if values == self._warehouse_ids:
            self.warehouse_choices.append(p)

        return self._rng.choice(a, size=size, replace=replace, p=p)

    def lognormal(self, *args, **kwargs):
        return self._rng.lognormal(*args, **kwargs)

    def triangular(self, *args, **kwargs):
        return self._rng.triangular(*args, **kwargs)

    def random(self, *args, **kwargs):
        return self._rng.random(*args, **kwargs)

    def integers(self, *args, **kwargs):
        return self._rng.integers(*args, **kwargs)

    def uniform(self, *args, **kwargs):
        return self._rng.uniform(*args, **kwargs)

    def shuffle(self, x):
        return self._rng.shuffle(x)


def _recorded_choices():
    module = _load_module("generate_dataset_sampling_probe")
    recorder = _RecordingRNG(2026, module)
    module.generate_dataset(rng=recorder)
    return module, recorder


def _relative_quantity(dataset, module):
    product_base = dataset["product_id"].map(
        {product_id: config["base"] for product_id, config in module.PRODUCTS.items()}
    )
    movement_factor = dataset["movement_type"].map(module.MOVEMENT_FACTORS)
    return dataset["quantity"] / (product_base * movement_factor)


def _outside_warehouse_window(dataset, module):
    return np.array([
        hour not in module.WAREHOUSE_HOURS[warehouse_id]
        for hour, warehouse_id in zip(dataset["hour"], dataset["warehouse_id"])
    ])


def _has_prior_normal_in_window(dataset, row, minutes=45):
    same_entity = dataset[
        (dataset["product_id"] == row["product_id"])
        & (dataset["warehouse_id"] == row["warehouse_id"])
        & (dataset["timestamp"] < row["timestamp"])
    ]
    window = same_entity[
        same_entity["timestamp"]
        >= row["timestamp"] - pd.Timedelta(minutes=minutes)
    ]
    return len(window) > 0 and bool((window["is_anomaly"] == 0).any())


def _sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ----------------------------------------------------------------------
# Reproducibility
# ----------------------------------------------------------------------

def test_generate_dataset_is_reproducible_across_repeated_calls():
    module = _load_module("generate_dataset_reproducibility_probe")

    first = module.generate_dataset()
    second = module.generate_dataset()

    pd.testing.assert_frame_equal(first, second)


def test_generate_dataset_uses_injected_rng():
    module = _load_module("generate_dataset_injected_rng_probe")

    first = module.generate_dataset(np.random.default_rng(123))
    second = module.generate_dataset(np.random.default_rng(123))
    different = module.generate_dataset(np.random.default_rng(124))

    pd.testing.assert_frame_equal(first, second)
    assert not first.equals(different)


def test_generate_dataset_does_not_mutate_module_or_global_rng_state():
    module = _load_module("generate_dataset_rng_isolation_probe")

    fallback_state_before = copy.deepcopy(module.rng.bit_generator.state)
    global_state_before = np.random.get_state()

    module.generate_dataset()

    np.testing.assert_equal(
        module.rng.bit_generator.state, fallback_state_before
    )
    global_state_after = np.random.get_state()
    assert global_state_after[0] == global_state_before[0]
    np.testing.assert_array_equal(global_state_after[1], global_state_before[1])
    assert global_state_after[2:] == global_state_before[2:]


# ----------------------------------------------------------------------
# Schema and invariants
# ----------------------------------------------------------------------

def test_dataset_schema_includes_entity_columns():
    module = _load_module("generate_dataset_schema_probe")
    dataset = module.generate_dataset(np.random.default_rng(42))

    assert list(dataset.columns) == [
        "timestamp",
        "quantity",
        "movement_type",
        "product_id",
        "warehouse_id",
        "is_anomaly",
        "anomaly_kind",
        "is_synthetic",
        "date",
        "hour",
        "day_of_week",
        "daily_average_quantity",
        "quantity_ratio",
    ]
    assert {column: str(dtype) for column, dtype in dataset.dtypes.items()} == {
        "timestamp": "datetime64[ns]",
        "quantity": "int64",
        "movement_type": "object",
        "product_id": "object",
        "warehouse_id": "object",
        "is_anomaly": "int64",
        "anomaly_kind": "object",
        "is_synthetic": "bool",
        "date": "datetime64[ns]",
        "hour": "int32",
        "day_of_week": "int32",
        "daily_average_quantity": "float64",
        "quantity_ratio": "float64",
    }


def test_dataset_basic_invariants_hold():
    module = _load_module("generate_dataset_invariants_probe")
    dataset = module.generate_dataset(np.random.default_rng(42))

    assert dataset["product_id"].isin(module.PRODUCT_IDS).all()
    assert dataset["warehouse_id"].isin(module.WAREHOUSE_IDS).all()
    assert dataset["quantity"].ge(1).all()
    assert dataset["timestamp"].is_monotonic_increasing
    assert dataset.isnull().sum().sum() == 0
    assert set(dataset["is_anomaly"].unique()) <= {0, 1}

    expected_kinds = {"none"} | set(module.SCENARIO_KINDS)
    assert set(dataset["anomaly_kind"].unique()) <= expected_kinds
    assert (dataset.loc[dataset["is_anomaly"] == 0, "anomaly_kind"] == "none").all()
    assert dataset.loc[
        dataset["is_anomaly"] == 1, "anomaly_kind"
    ].isin(module.SCENARIO_KINDS).all()


def test_anomaly_prevalence_and_scenario_proportions_are_balanced():
    module = _load_module("generate_dataset_balance_probe")
    dataset = module.generate_dataset(np.random.default_rng(42))
    anomalies = dataset[dataset["is_anomaly"] == 1]

    assert 0.04 <= dataset["is_anomaly"].mean() <= 0.06

    shares = anomalies["anomaly_kind"].value_counts(normalize=True)
    for kind in module.SCENARIO_KINDS:
        assert 0.20 <= shares[kind] <= 0.30


# ----------------------------------------------------------------------
# Confounding
# ----------------------------------------------------------------------

def test_movement_type_probabilities_are_the_same_for_all_rows():
    module, recorder = _recorded_choices()

    anomaly_count = int(module.TOTAL_MOVEMENTS * module.ANOMALY_RATE)
    normal_count = module.TOTAL_MOVEMENTS - anomaly_count

    assert len(recorder.movement_type_choices) == module.TOTAL_MOVEMENTS
    assert all(
        probabilities == module.MOVEMENT_PROBABILITIES
        for probabilities in recorder.movement_type_choices[:normal_count]
    )
    assert all(
        probabilities == module.MOVEMENT_PROBABILITIES
        for probabilities in recorder.movement_type_choices[normal_count:]
    )


def test_entities_are_sampled_uniformly_for_every_row_group():
    module, recorder = _recorded_choices()
    dataset = module.generate_dataset(np.random.default_rng(42))
    anomalies = dataset[dataset["is_anomaly"] == 1]

    assert len(recorder.product_choices) == len(recorder.warehouse_choices)
    assert all(probabilities is None for probabilities in recorder.product_choices)
    assert all(probabilities is None for probabilities in recorder.warehouse_choices)

    for column, entities, low, high in [
        ("product_id", module.PRODUCT_IDS, 0.01, 0.25),
        ("warehouse_id", module.WAREHOUSE_IDS, 0.05, 0.40),
    ]:
        shares = anomalies[column].value_counts(normalize=True)
        assert set(shares.index) == set(entities)
        assert shares.between(low, high).all()


def test_anomaly_rates_are_not_concentrated_by_entity_or_time():
    module = _load_module("generate_dataset_confounding_probe")

    for seed in CONFOUND_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))

        for column, low, high in [
            ("movement_type", 0.02, 0.09),
            ("product_id", 0.02, 0.09),
            ("warehouse_id", 0.03, 0.08),
        ]:
            rates = dataset.groupby(column)["is_anomaly"].mean()
            assert rates.between(low, high).all()

        time_bins = pd.qcut(dataset["timestamp"], 10, labels=False)
        time_rates = dataset.groupby(time_bins)["is_anomaly"].mean()
        assert time_rates.between(0.02, 0.10).all()


# ----------------------------------------------------------------------
# Realism / shortcut resistance
# ----------------------------------------------------------------------

def test_normal_movements_include_off_hours_and_quantity_tail_events():
    module = _load_module("generate_dataset_normal_diversity_probe")
    boundary_hours = {
        warehouse_id: {hours[0], hours[-1]}
        for warehouse_id, hours in module.WAREHOUSE_HOURS.items()
    }

    for seed in CONFOUND_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        normals = dataset[dataset["is_anomaly"] == 0]

        off_hours_normals = normals["hour"].isin(module.OFF_HOURS).sum()
        assert off_hours_normals >= 10

        outside_normals = _outside_warehouse_window(normals, module)
        assert outside_normals.mean() >= 0.01

        boundary_normals = sum(
            hour in boundary_hours[warehouse_id]
            for hour, warehouse_id in zip(normals["hour"], normals["warehouse_id"])
        )
        assert boundary_normals >= 10

        relative_quantity = _relative_quantity(dataset, module)
        normal_quantity = relative_quantity.loc[normals.index]
        assert (normal_quantity > 1.3).sum() >= 10
        assert (normal_quantity < 0.8).sum() >= 10


def test_normal_busy_periods_overlap_frequency_cluster_sizes():
    module = _load_module("generate_dataset_busy_period_probe")
    dataset = module.generate_dataset(np.random.default_rng(42))
    ordered = dataset.sort_values(
        ["product_id", "warehouse_id", "timestamp"]
    ).copy()

    prior_time = ordered.groupby(
        ["product_id", "warehouse_id"]
    )["timestamp"].shift(1)
    prior_label = ordered.groupby(
        ["product_id", "warehouse_id"]
    )["is_anomaly"].shift(1)
    gap_minutes = (ordered["timestamp"] - prior_time).dt.total_seconds() / 60

    normal_cluster_rows = (
        (ordered["is_anomaly"] == 0)
        & (prior_label == 0)
        & gap_minutes.le(module.FREQUENCY_WINDOW_MINUTES)
    )
    assert normal_cluster_rows.sum() >= 20


def test_frequency_anomalies_are_clustered_but_use_normal_quantities():
    module = _load_module("generate_dataset_frequency_probe")

    for seed in CONFOUND_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        anomalies = dataset[dataset["is_anomaly"] == 1]
        frequency = anomalies[anomalies["anomaly_kind"] == "frequency"]
        normals = dataset[dataset["is_anomaly"] == 0]

        assert len(frequency) >= 40
        clustered = sum(
            _has_prior_normal_in_window(
                dataset, row, module.FREQUENCY_WINDOW_MINUTES
            )
            for _, row in frequency.iterrows()
        )
        assert clustered / len(frequency) >= 0.95

        relative_quantity = _relative_quantity(dataset, module)
        normal_quantity = relative_quantity.loc[normals.index]
        frequency_quantity = relative_quantity.loc[frequency.index]

        normal_median = normal_quantity.median()
        assert 0.7 <= frequency_quantity.median() / normal_median <= 1.4

        normal_low, normal_high = np.percentile(normal_quantity, [1, 99])
        inside = frequency_quantity.between(normal_low, normal_high).mean()
        assert inside >= 0.90


def test_timing_anomalies_overlap_warehouse_schedule():
    module = _load_module("generate_dataset_timing_probe")

    for seed in AUDIT_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        anomalies = dataset[dataset["is_anomaly"] == 1]
        timing = anomalies[anomalies["anomaly_kind"] == "timing"]
        normals = dataset[dataset["is_anomaly"] == 0]

        timing_outside = _outside_warehouse_window(timing, module)
        normal_outside = _outside_warehouse_window(normals, module)

        assert 0.02 <= timing_outside.mean() <= 0.60
        assert normal_outside.mean() >= 0.01

        timing_global_off_hours = timing["hour"].isin(module.OFF_HOURS).mean()
        assert 0.02 <= timing_global_off_hours <= 0.60


def test_global_off_hours_does_not_predict_timing_labels_perfectly():
    module = _load_module("generate_dataset_global_off_hours_probe")

    for seed in AUDIT_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        timing = (
            (dataset["is_anomaly"] == 1)
            & (dataset["anomaly_kind"] == "timing")
        )
        normal = dataset["is_anomaly"] == 0
        comparison = timing | normal
        predicted = dataset["hour"].isin(module.OFF_HOURS)

        recall = predicted[timing].mean()
        true_positives = int((predicted & timing).sum())
        predicted_positives = int((predicted & comparison).sum())
        precision = (
            true_positives / predicted_positives if predicted_positives else 0.0
        )

        assert recall <= 0.60
        assert precision <= 0.50


def test_no_single_absolute_hour_creates_near_perfect_separation():
    module = _load_module("generate_dataset_absolute_hour_probe")

    for seed in AUDIT_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        hour_rates = dataset.groupby("hour")["is_anomaly"].mean()
        assert hour_rates.max() <= 0.60


def test_quantity_and_combined_anomalies_overlap_normal_quantities():
    module = _load_module("generate_dataset_quantity_overlap_probe")

    for seed in CONFOUND_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        anomalies = dataset[dataset["is_anomaly"] == 1]
        normals = dataset[dataset["is_anomaly"] == 0]

        relative_quantity = _relative_quantity(dataset, module)
        normal_quantity = relative_quantity.loc[normals.index]
        normal_low, normal_high = np.percentile(normal_quantity, [10, 90])

        for kind in ["quantity", "combined"]:
            kind_quantity = relative_quantity.loc[
                anomalies.index[anomalies["anomaly_kind"] == kind]
            ]
            overlap = kind_quantity.between(normal_low, normal_high).mean()
            assert overlap >= 0.30


def test_combined_anomalies_have_no_single_feature_shortcut():
    module = _load_module("generate_dataset_combined_probe")
    combined_outside_rates = []
    normal_outside_rates = []

    for seed in AUDIT_SEEDS:
        dataset = module.generate_dataset(np.random.default_rng(seed))
        anomalies = dataset[dataset["is_anomaly"] == 1]
        combined = anomalies[anomalies["anomaly_kind"] == "combined"]
        normals = dataset[dataset["is_anomaly"] == 0]

        relative_quantity = _relative_quantity(dataset, module)
        combined_quantity = relative_quantity.loc[combined.index]
        off_hours = combined["hour"].isin(module.OFF_HOURS)
        deviating = (combined_quantity < 0.7) | (combined_quantity > 1.5)
        combined_outside = _outside_warehouse_window(combined, module)
        normal_outside = _outside_warehouse_window(normals, module)

        combined_outside_rates.append(combined_outside.mean())
        normal_outside_rates.append(normal_outside.mean())

        assert 0.02 <= combined_outside.mean() <= 0.50
        assert off_hours.mean() <= 0.60
        assert 0.20 <= deviating.mean() <= 0.90
        assert (off_hours & deviating).mean() <= 0.40

    assert np.mean(combined_outside_rates) > np.mean(normal_outside_rates)


# ----------------------------------------------------------------------
# Safety
# ----------------------------------------------------------------------

def test_generate_dataset_never_writes_files(tmp_path, monkeypatch):
    module = _load_module("generate_dataset_no_write_probe")
    protected_files = [EXISTING_CSV, LEGACY_CSV, MODEL_ARTIFACT]
    hashes_before = [_sha256(path) for path in protected_files]

    output_path = tmp_path / "should_not_be_written.csv"
    monkeypatch.setattr(module, "OUTPUT_FILE", output_path)

    def _no_to_csv(*args, **kwargs):
        raise AssertionError("generate_dataset must not write a CSV")

    monkeypatch.setattr(module.pd.DataFrame, "to_csv", _no_to_csv)

    module.generate_dataset(np.random.default_rng(7))

    assert not output_path.exists()
    assert list(tmp_path.iterdir()) == []
    assert [_sha256(path) for path in protected_files] == hashes_before


def _cli_fixture():
    return pd.DataFrame({
        "timestamp": pd.to_datetime(["2026-01-01 00:00:00"]),
        "quantity": [1],
        "quantity_ratio": [1.0],
        "is_anomaly": [0],
        "anomaly_kind": ["none"],
    })


def test_cli_without_output_does_not_write_csv(tmp_path, monkeypatch, capsys):
    module = _load_module("generate_dataset_cli_no_output_probe")
    fake_dataset = _cli_fixture()
    monkeypatch.setattr(module, "generate_dataset", lambda rng=None: fake_dataset)
    monkeypatch.setattr(module, "OUTPUT_FILE", tmp_path / "forbidden.csv")

    real_to_csv = pd.DataFrame.to_csv
    calls = []

    def _record_to_csv(self, *args, **kwargs):
        calls.append((args, kwargs))
        return real_to_csv(self, *args, **kwargs)

    monkeypatch.setattr(pd.DataFrame, "to_csv", _record_to_csv)

    module.main([])

    assert calls == []
    assert not (tmp_path / "forbidden.csv").exists()
    assert list(tmp_path.iterdir()) == []
    assert "aucun (CSV non écrit" in capsys.readouterr().out


def test_cli_with_output_writes_only_specified_path(tmp_path, monkeypatch, capsys):
    module = _load_module("generate_dataset_cli_output_probe")
    fake_dataset = _cli_fixture()
    monkeypatch.setattr(module, "generate_dataset", lambda rng=None: fake_dataset)
    output_path = tmp_path / "custom.csv"

    real_to_csv = pd.DataFrame.to_csv
    calls = []

    def _record_to_csv(self, path=None, *args, **kwargs):
        calls.append(Path(path))
        return real_to_csv(self, path, *args, **kwargs)

    monkeypatch.setattr(pd.DataFrame, "to_csv", _record_to_csv)

    module.main(["--output", str(output_path)])

    assert calls == [output_path]
    assert output_path.exists()
    assert list(tmp_path.iterdir()) == [output_path]
    assert str(output_path) in capsys.readouterr().out


def test_helper_compatibility_is_preserved():
    module = _load_module("generate_dataset_helper_compatibility_probe")

    assert isinstance(module.generate_normal_quantity("IN"), int)
    assert module.generate_normal_hour() in list(range(7, 20)) + module.OFF_HOURS
    assert isinstance(module.generate_anomalous_quantity("IN"), int)
    assert isinstance(
        module.generate_anomalous_quantity("IN", mild=True), int
    )

    timestamp = module.random_timestamp(
        pd.Timestamp("2026-01-01"), 10, 10
    )
    assert isinstance(timestamp, pd.Timestamp)

    explicit = module.generate_normal_quantity(
        "IN", np.random.default_rng(9)
    )
    assert isinstance(explicit, int)
