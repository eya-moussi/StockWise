import hashlib
import importlib.util
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


AI_SERVICE_DIR = Path(__file__).resolve().parents[1]
EVALUATION_PATH = AI_SERVICE_DIR / "evaluation.py"
MODEL_FILE = AI_SERVICE_DIR / "models" / "isolation_forest.joblib"
EXPECTED_MODEL_SHA256 = (
    "890d1182ec16a8b90d6265e37ff5b66dab419869e21007f52750437ea416c760"
)


def _load_module(module_name):
    if str(AI_SERVICE_DIR) not in sys.path:
        sys.path.insert(0, str(AI_SERVICE_DIR))
    spec = importlib.util.spec_from_file_location(module_name, EVALUATION_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _fixture(n_rows=20):
    timestamps = pd.date_range("2026-01-01", periods=n_rows, freq="h")
    is_anomaly = np.zeros(n_rows, dtype=int)
    is_anomaly[2::5] = 1

    kinds = np.array(["none"] * n_rows, dtype=object)
    anomaly_kinds = ["quantity", "time", "combined", "quantity"]
    cursor = 0
    for index in np.flatnonzero(is_anomaly):
        kinds[index] = anomaly_kinds[cursor % len(anomaly_kinds)]
        cursor += 1

    return pd.DataFrame({
        "timestamp": timestamps,
        "quantity": np.arange(5, 5 + n_rows),
        "movement_type": ["IN", "OUT", "TRANSFER", "CORRECTION"] * (n_rows // 4)
        + ["IN"] * (n_rows % 4),
        "is_anomaly": is_anomaly,
        "anomaly_kind": kinds,
        "hour": timestamps.hour,
        "day_of_week": timestamps.dayofweek,
        "quantity_ratio": np.linspace(0.8, 1.6, n_rows),
    })


def _context_fixture(n_rows=40):
    timestamps = pd.date_range("2026-01-01", periods=n_rows, freq="10min")
    is_anomaly = np.zeros(n_rows, dtype=int)
    is_anomaly[5::9] = 1

    kinds = np.array(["none"] * n_rows, dtype=object)
    kinds[is_anomaly == 1] = "quantity"

    return pd.DataFrame({
        "timestamp": timestamps,
        "quantity": np.arange(5, 5 + n_rows, dtype=float),
        "movement_type": ["IN", "OUT", "TRANSFER", "CORRECTION"] * (n_rows // 4)
        + ["IN"] * (n_rows % 4),
        "product_id": ["P1", "P2"] * (n_rows // 2) + ["P1"] * (n_rows % 2),
        "warehouse_id": ["W1"] * n_rows,
        "is_anomaly": is_anomaly,
        "anomaly_kind": kinds,
        "is_synthetic": [True] * n_rows,
        "date": timestamps.normalize(),
        "hour": timestamps.hour,
        "day_of_week": timestamps.dayofweek,
        "quantity_ratio": np.linspace(0.9, 1.2, n_rows),
    })


def test_chronological_split_preserves_order_and_boundaries():
    evaluation = _load_module("evaluation_chronological_probe")
    data = _fixture()

    train, validation, test = evaluation.chronological_split(data)

    assert len(train) == 12
    assert len(validation) == 4
    assert len(test) == 4
    assert train["timestamp"].max() < validation["timestamp"].min()
    assert validation["timestamp"].max() < test["timestamp"].min()
    assert list(train["timestamp"]) == sorted(train["timestamp"])
    assert list(validation["timestamp"]) == sorted(validation["timestamp"])
    assert list(test["timestamp"]) == sorted(test["timestamp"])


def test_chronological_split_has_no_overlap_and_full_coverage():
    evaluation = _load_module("evaluation_coverage_probe")
    data = _fixture()

    train, validation, test = evaluation.chronological_split(data)
    indices = [set(part.index) for part in (train, validation, test)]

    assert indices[0].isdisjoint(indices[1])
    assert indices[0].isdisjoint(indices[2])
    assert indices[1].isdisjoint(indices[2])
    assert set.union(*indices) == set(range(len(data)))


def test_chronological_split_is_deterministic():
    evaluation = _load_module("evaluation_deterministic_probe")
    data = _fixture()

    first = evaluation.chronological_split(data)
    second = evaluation.chronological_split(data)

    for left, right in zip(first, second):
        pd.testing.assert_frame_equal(left, right)


def test_training_receives_x_train_only_and_never_labels(monkeypatch):
    evaluation = _load_module("evaluation_no_label_fit_probe")
    train, validation, test = evaluation.chronological_split(
        evaluation.prepare_data(_fixture())
    )

    class _FitRecorder:
        def __init__(self):
            self.fit_call = None

        def fit(self, X, y=None):
            self.fit_call = (X.copy(), y)
            return self

        def decision_function(self, X):
            return np.zeros(len(X))

    recorder = _FitRecorder()
    monkeypatch.setattr(evaluation, "build_pipeline", lambda *a, **k: recorder)

    evaluation.evaluate_model("probe", train, validation, test, "full")

    expected_X = train[evaluation.feature_columns("full")]
    pd.testing.assert_frame_equal(recorder.fit_call[0], expected_X)
    assert recorder.fit_call[1] is None


def test_validation_threshold_selection_does_not_receive_test_labels(monkeypatch):
    evaluation = _load_module("evaluation_validation_only_probe")
    train, validation, test = evaluation.chronological_split(
        evaluation.prepare_data(_fixture())
    )
    real_sweep = evaluation.threshold_sweep
    captured = {}

    def _spy(y_true, scores):
        captured["y_true"] = np.asarray(y_true).copy()
        return real_sweep(y_true, scores)

    monkeypatch.setattr(evaluation, "threshold_sweep", _spy)

    evaluation.evaluate_model("probe", train, validation, test, "full")

    np.testing.assert_array_equal(
        captured["y_true"], validation["is_anomaly"].to_numpy()
    )
    assert not np.array_equal(
        captured["y_true"], test["is_anomaly"].to_numpy()
    )


def test_threshold_predictions_are_correct_on_small_fixture():
    evaluation = _load_module("evaluation_threshold_prediction_probe")
    scores = np.array([0.1, 0.4, 0.6, 0.9])

    predictions = evaluation.predict_at_threshold(scores, 0.5)

    np.testing.assert_array_equal(predictions, np.array([0, 0, 1, 1]))


def test_metrics_match_sklearn_on_small_fixture():
    evaluation = _load_module("evaluation_metrics_probe")
    y_true = np.array([0, 0, 1, 1])
    predictions = np.array([0, 1, 1, 1])
    scores = np.array([0.1, 0.4, 0.8, 0.9])

    metrics = evaluation.classification_metrics(y_true, predictions)

    assert metrics["precision"] == precision_score(y_true, predictions)
    assert metrics["recall"] == recall_score(y_true, predictions)
    assert metrics["F1"] == f1_score(y_true, predictions)
    assert metrics["confusion_matrix"] == confusion_matrix(
        y_true, predictions, labels=[0, 1]
    ).tolist()
    assert evaluation.average_precision(y_true, scores) == average_precision_score(
        y_true, scores
    )


def test_zero_support_categories_are_handled_safely():
    evaluation = _load_module("evaluation_zero_support_probe")
    metadata = pd.DataFrame({"anomaly_kind": ["none", "none"]})

    derived = evaluation.per_category_metrics(metadata, [0, 0], [0, 0])
    explicit = evaluation.per_category_metrics(
        metadata, [0, 0], [0, 0], categories=("quantity", "time", "combined")
    )
    metrics = evaluation.classification_metrics([0, 0], [0, 0])

    assert derived.empty
    assert explicit["category"].tolist() == ["quantity", "time", "combined"]
    assert explicit["support"].tolist() == [0, 0, 0]
    assert explicit["recall"].tolist() == [0.0, 0.0, 0.0]
    assert metrics["F1"] == 0.0
    assert metrics["FPR"] == 0.0
    assert evaluation.average_precision([0, 0], [0.1, 0.2]) == 0.0


def test_category_metrics_derive_observed_categories_and_exclude_none():
    evaluation = _load_module("evaluation_category_derivation_probe")
    metadata = pd.DataFrame({
        "anomaly_kind": [
            "none", "quantity", "frequency", "timing", "combined", "quantity"
        ]
    })
    y_true = np.array([0, 1, 1, 1, 1, 1])
    scores = np.array([0.1, 0.9, 0.2, 0.8, 0.3, 0.7])

    derived = evaluation.per_category_metrics(metadata, y_true, y_pred=[1, 1, 0, 1, 0, 1])
    _, via_predictions = evaluation.evaluate_predictions(
        y_true, scores, 0.5, metadata=metadata
    )
    _, explicit = evaluation.evaluate_predictions(
        y_true, scores, 0.5, metadata=metadata, categories=("combined",)
    )

    assert derived["category"].tolist() == [
        "quantity", "frequency", "timing", "combined"
    ]
    assert derived["support"].tolist() == [2, 1, 1, 1]
    assert derived["detected"].tolist() == [2, 0, 1, 0]
    assert derived["recall"].tolist() == [1.0, 0.0, 1.0, 0.0]
    pd.testing.assert_frame_equal(via_predictions, derived)
    assert explicit["category"].tolist() == ["combined"]
    assert explicit["support"].tolist() == [1]


def test_threshold_table_alert_count_and_rate_calculations():
    evaluation = _load_module("evaluation_threshold_table_probe")
    y_true = np.array([0, 1, 1])
    scores = np.array([0.1, 0.5, 0.9])

    table = evaluation.threshold_sweep(y_true, scores)

    for _, row in table.iterrows():
        expected = int((scores >= row["threshold"]).sum())
        assert row["alert_count"] == expected
        assert row["alert_rate"] == expected / len(scores)


def test_threshold_tie_breaking_prefers_fewer_alerts():
    evaluation = _load_module("evaluation_tie_break_probe")
    table = pd.DataFrame({
        "threshold": [0.5, 0.9],
        "F1": [0.8, 0.8],
        "alert_count": [10, 4],
    })

    assert evaluation.select_threshold(table) == 0.9


def test_seeded_random_baseline_is_reproducible():
    evaluation = _load_module("evaluation_random_baseline_probe")

    first = evaluation.random_scores(10, 42)
    second = evaluation.random_scores(10, 42)
    different = evaluation.random_scores(10, 43)

    np.testing.assert_array_equal(first, second)
    assert not np.array_equal(first, different)


def test_feature_ablation_column_isolation():
    evaluation = _load_module("evaluation_ablation_columns_probe")

    for name, group in evaluation.FEATURE_GROUPS.items():
        pipeline = evaluation.build_pipeline(
            group["numeric"], group["categorical"]
        )
        transformers = {
            entry[0]: list(entry[2])
            for entry in pipeline.named_steps["preprocessing"].transformers
        }
        expected = {
            key: list(value)
            for key, value in group.items()
            if value
        }
        assert transformers == expected
        assert evaluation.feature_columns(name) == (
            list(group["numeric"]) + list(group["categorical"])
        )


def test_all_ablations_reuse_identical_split_indices(monkeypatch):
    evaluation = _load_module("evaluation_shared_split_probe")
    real_split = evaluation.chronological_split
    calls = []

    def _spy(data, *args, **kwargs):
        calls.append(1)
        return real_split(data, *args, **kwargs)

    monkeypatch.setattr(evaluation, "chronological_split", _spy)

    result = evaluation.run_evaluation(_fixture(), seed=1)

    expected_baselines = ["random", "quantity_deviation", "off_hours"]
    expected_feature_groups = set(
        evaluation.LEGACY_FEATURE_GROUPS + evaluation.CONTEXTUAL_FEATURE_GROUPS
    )
    baseline_results = [
        item for item in result["results"] if item["kind"] == "score"
    ]
    model_results = [
        item for item in result["results"] if item["kind"] == "model"
    ]
    skipped = result["skipped"]

    assert set(evaluation.FEATURE_GROUPS) == expected_feature_groups
    assert len(calls) == 1
    assert [item["name"] for item in baseline_results] == expected_baselines
    assert {item["feature_group"] for item in model_results} == set(
        evaluation.LEGACY_FEATURE_GROUPS
    )
    assert len(model_results) == len(evaluation.LEGACY_FEATURE_GROUPS)
    assert {item["feature_group"] for item in skipped} == set(
        evaluation.CONTEXTUAL_FEATURE_GROUPS
    )
    assert all(item["reason"] for item in skipped)
    assert len(result["results"]) == (
        len(expected_baselines) + len(evaluation.LEGACY_FEATURE_GROUPS)
    )
    assert all(not item["threshold_table"].empty for item in model_results)
    assert all(np.isfinite(item["threshold"]) for item in model_results)


def test_existing_dataset_evaluation_works():
    evaluation = _load_module("evaluation_existing_csv_probe")
    data = pd.read_csv(evaluation.DATA_FILE, parse_dates=["timestamp"])

    train, validation, test = evaluation.chronological_split(
        evaluation.prepare_data(data)
    )
    result = evaluation.evaluate_model(
        "existing_csv_probe", train, validation, test, "full"
    )

    assert np.isfinite(result["threshold"])
    assert result["metrics"]["AP"] >= 0.0
    assert not result["categories"].empty


def test_in_memory_synthetic_mode_works_without_file_writes(monkeypatch):
    evaluation = _load_module("evaluation_synthetic_no_write_probe")

    def _fail(*args, **kwargs):
        raise AssertionError("file write attempted")

    monkeypatch.setattr(pd.DataFrame, "to_csv", _fail)
    monkeypatch.setattr(joblib, "dump", _fail)

    data = evaluation.load_dataset("synthetic", seed=7)

    assert len(data) > 0
    assert "timestamp" in data.columns
    assert "is_anomaly" in data.columns


def test_evaluation_does_not_call_csv_or_model_writers(monkeypatch):
    evaluation = _load_module("evaluation_no_writers_probe")

    def _fail(*args, **kwargs):
        raise AssertionError("file write attempted")

    monkeypatch.setattr(pd.DataFrame, "to_csv", _fail)
    monkeypatch.setattr(joblib, "dump", _fail)

    result = evaluation.run_evaluation(_fixture(), seed=1)

    assert len(result["results"]) == 10


def test_legacy_feature_groups_remain_unchanged():
    evaluation = _load_module("evaluation_legacy_groups_probe")

    assert evaluation.LEGACY_FEATURE_GROUPS == [
        "full",
        "quantity",
        "time",
        "movement",
        "quantity_time",
        "quantity_movement",
        "time_movement",
    ]
    assert evaluation.FEATURE_GROUPS["full"] == {
        "numeric": list(evaluation.NUMERIC_FEATURES),
        "categorical": list(evaluation.CATEGORICAL_FEATURES),
    }
    assert evaluation.FEATURE_GROUPS["quantity"] == {
        "numeric": list(evaluation.QUANTITY_FEATURES),
        "categorical": [],
    }
    assert evaluation.FEATURE_GROUPS["time"] == {
        "numeric": list(evaluation.TIME_FEATURES),
        "categorical": [],
    }
    assert evaluation.FEATURE_GROUPS["movement"] == {
        "numeric": [],
        "categorical": list(evaluation.MOVEMENT_FEATURES),
    }


def test_contextual_feature_groups_resolve_exact_columns():
    evaluation = _load_module("evaluation_context_columns_probe")
    legacy = [
        "quantity",
        "quantity_ratio",
        "quantity_deviation",
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos",
        "is_off_hours",
    ]
    raw_context = [
        "entity_quantity_ratio",
        "entity_count_1h",
        "entity_gap_minutes",
        "entity_hour_tail_score",
    ]
    safe_context = [
        "entity_quantity_ratio_log",
        "entity_count_1h",
        "entity_gap_log",
        "entity_hour_tail_score",
    ]
    expected = {
        "context_only_raw": raw_context,
        "context_only_safe": safe_context,
        "legacy_context_raw": legacy + raw_context + ["movement_type"],
        "legacy_context_safe": legacy + safe_context + ["movement_type"],
        "context_no_gap": [
            "entity_quantity_ratio_log",
            "entity_count_1h",
            "entity_hour_tail_score",
        ],
        "context_gap_indicator": safe_context + ["entity_has_prior_history"],
        "context_multi_window": [
            "entity_quantity_ratio",
            "entity_count_15m",
            "entity_count_30m",
            "entity_count_1h",
            "entity_gap_log",
            "entity_hour_tail_score",
        ],
    }

    assert evaluation.CONTEXTUAL_FEATURE_GROUPS == list(expected)
    for name, columns in expected.items():
        assert evaluation.feature_columns(name) == columns


def test_prepare_data_adds_multi_window_counts_only_with_context():
    evaluation = _load_module("evaluation_multi_window_probe")

    context_data = evaluation.prepare_data(_context_fixture())
    for column in ["entity_count_15m", "entity_count_30m", "entity_count_1h"]:
        assert column in context_data.columns
        assert np.isfinite(context_data[column].to_numpy(dtype=float)).all()

    legacy_data = evaluation.prepare_data(_fixture())
    assert not any(
        column.startswith("entity_") for column in legacy_data.columns
    )


def test_missing_context_columns_are_skipped_explicitly():
    evaluation = _load_module("evaluation_context_skip_probe")

    result = evaluation.run_evaluation(_fixture(), seed=1)
    skipped = {item["feature_group"]: item for item in result["skipped"]}

    assert set(skipped) == set(evaluation.CONTEXTUAL_FEATURE_GROUPS)
    assert all("missing columns" in item["reason"] for item in skipped.values())
    assert not any(
        item["feature_group"] in evaluation.CONTEXTUAL_FEATURE_GROUPS
        for item in result["results"]
    )


def test_contextual_groups_work_with_synthetic_data(monkeypatch):
    evaluation = _load_module("evaluation_context_synthetic_probe")

    def _fail(*args, **kwargs):
        raise AssertionError("file write attempted")

    monkeypatch.setattr(pd.DataFrame, "to_csv", _fail)
    monkeypatch.setattr(joblib, "dump", _fail)

    data = evaluation.load_dataset("synthetic", seed=7)
    result = evaluation.run_evaluation(data, seed=7)
    evaluated = {
        item["feature_group"]
        for item in result["results"]
        if item["kind"] == "model"
    }

    assert result["skipped"] == []
    assert set(evaluation.CONTEXTUAL_FEATURE_GROUPS).issubset(evaluated)
    prepared = evaluation.prepare_data(data)
    assert set(evaluation.CONTEXT_MULTI_WINDOW_FEATURES).issubset(
        prepared.columns
    )


def test_contextual_fit_never_receives_labels_or_scenario_columns(monkeypatch):
    evaluation = _load_module("evaluation_context_no_label_probe")
    train, validation, test = evaluation.chronological_split(
        evaluation.prepare_data(_context_fixture())
    )
    for split in (train, validation, test):
        split["scenario"] = "synthetic"

    class _FitRecorder:
        def __init__(self):
            self.fit_call = None

        def fit(self, X, y=None):
            self.fit_call = (X.copy(), y)
            return self

        def decision_function(self, X):
            return np.zeros(len(X))

    recorder = _FitRecorder()
    monkeypatch.setattr(evaluation, "build_pipeline", lambda *a, **k: recorder)

    evaluation.evaluate_model(
        "context_probe", train, validation, test, "legacy_context_safe"
    )

    expected_columns = evaluation.feature_columns("legacy_context_safe")
    assert list(recorder.fit_call[0].columns) == expected_columns
    assert recorder.fit_call[1] is None
    assert not {"is_anomaly", "anomaly_kind", "scenario", "is_synthetic"}.intersection(
        recorder.fit_call[0].columns
    )


def test_contextual_validation_threshold_uses_only_validation_labels(monkeypatch):
    evaluation = _load_module("evaluation_context_threshold_probe")
    train, validation, test = evaluation.chronological_split(
        evaluation.prepare_data(_context_fixture())
    )
    real_sweep = evaluation.threshold_sweep
    captured = []

    def _spy(y_true, scores):
        captured.append(np.asarray(y_true).copy())
        return real_sweep(y_true, scores)

    monkeypatch.setattr(evaluation, "threshold_sweep", _spy)

    evaluation.evaluate_model(
        "context_probe", train, validation, test, "context_only_safe"
    )

    assert len(captured) == 1
    np.testing.assert_array_equal(captured[0], validation["is_anomaly"].to_numpy())
    assert not np.array_equal(captured[0], test["is_anomaly"].to_numpy())


def test_contextual_test_metrics_run_after_threshold_selection(monkeypatch):
    evaluation = _load_module("evaluation_context_metric_order_probe")
    train, validation, test = evaluation.chronological_split(
        evaluation.prepare_data(_context_fixture())
    )
    events = []
    real_scores = evaluation.anomaly_scores
    real_sweep = evaluation.threshold_sweep
    real_metrics = evaluation.evaluate_predictions

    def _scores(model, X):
        events.append("score")
        return real_scores(model, X)

    def _sweep(y_true, scores):
        events.append("threshold")
        return real_sweep(y_true, scores)

    def _metrics(*args, **kwargs):
        events.append("metrics")
        return real_metrics(*args, **kwargs)

    monkeypatch.setattr(evaluation, "anomaly_scores", _scores)
    monkeypatch.setattr(evaluation, "threshold_sweep", _sweep)
    monkeypatch.setattr(evaluation, "evaluate_predictions", _metrics)

    evaluation.evaluate_model(
        "context_probe", train, validation, test, "context_only_safe"
    )

    assert events.count("score") == 2
    assert events.count("threshold") == 1
    assert events.count("metrics") == 1
    assert events.index("threshold") > events.index("score")
    assert events[-1] == "metrics"


def test_contextual_group_failure_does_not_corrupt_other_groups(monkeypatch):
    evaluation = _load_module("evaluation_context_failure_probe")
    real_evaluate_model = evaluation.evaluate_model

    def _failing_evaluate_model(name, *args, **kwargs):
        if name == "context_only_raw_if":
            raise RuntimeError("boom")
        return real_evaluate_model(name, *args, **kwargs)

    monkeypatch.setattr(evaluation, "evaluate_model", _failing_evaluate_model)

    result = evaluation.run_evaluation(_context_fixture(), seed=1)
    model_names = {
        item["name"] for item in result["results"] if item["kind"] == "model"
    }
    skipped = {item["name"]: item for item in result["skipped"]}

    assert "context_only_raw_if" not in model_names
    assert "context_only_raw_if" in skipped
    assert "evaluation failed" in skipped["context_only_raw_if"]["reason"]
    assert "legacy_context_safe_if" in model_names
    assert "context_multi_window_if" in model_names
    assert "full_if" in model_names


def test_saved_model_hash_remains_unchanged():
    evaluation = _load_module("evaluation_model_hash_probe")
    before = hashlib.sha256(MODEL_FILE.read_bytes()).hexdigest()

    evaluation.run_evaluation(_fixture(), seed=1)

    after = hashlib.sha256(MODEL_FILE.read_bytes()).hexdigest()
    assert before == EXPECTED_MODEL_SHA256
    assert after == before
