from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, confusion_matrix
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from features import (
    CATEGORICAL_FEATURES,
    CONTEXT_REQUIRED_COLUMNS,
    CONTEXTUAL_NUMERIC_FEATURES,
    ENTITY_COUNT_WINDOWS,
    NUMERIC_FEATURES,
    build_features,
    causal_entity_features,
)
from generate_dataset import generate_dataset


BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "ifc_synthetic_dataset.csv"

RANDOM_STATE = 42
CONTAMINATION = 0.05
TRAIN_FRAC = 0.60
VAL_FRAC = 0.20
QUANTILE_POINTS = 21

QUANTITY_FEATURES = ["quantity", "quantity_ratio", "quantity_deviation"]
TIME_FEATURES = [
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "is_off_hours",
]
MOVEMENT_FEATURES = list(CATEGORICAL_FEATURES)

CONTEXT_RAW_FEATURES = list(CONTEXTUAL_NUMERIC_FEATURES)
CONTEXT_SAFE_FEATURES = [
    "entity_quantity_ratio_log",
    "entity_count_1h",
    "entity_gap_log",
    "entity_hour_tail_score",
]
CONTEXT_MULTI_WINDOW_FEATURES = [
    "entity_quantity_ratio",
    "entity_count_15m",
    "entity_count_30m",
    "entity_count_1h",
    "entity_gap_log",
    "entity_hour_tail_score",
]

LEGACY_FEATURE_GROUPS = [
    "full",
    "quantity",
    "time",
    "movement",
    "quantity_time",
    "quantity_movement",
    "time_movement",
]
CONTEXTUAL_FEATURE_GROUPS = [
    "context_only_raw",
    "context_only_safe",
    "legacy_context_raw",
    "legacy_context_safe",
    "context_no_gap",
    "context_gap_indicator",
    "context_multi_window",
]

FEATURE_GROUPS = {
    "full": {
        "numeric": list(NUMERIC_FEATURES),
        "categorical": list(CATEGORICAL_FEATURES),
    },
    "quantity": {
        "numeric": list(QUANTITY_FEATURES),
        "categorical": [],
    },
    "time": {
        "numeric": list(TIME_FEATURES),
        "categorical": [],
    },
    "movement": {
        "numeric": [],
        "categorical": list(MOVEMENT_FEATURES),
    },
    "quantity_time": {
        "numeric": QUANTITY_FEATURES + TIME_FEATURES,
        "categorical": [],
    },
    "quantity_movement": {
        "numeric": list(QUANTITY_FEATURES),
        "categorical": list(MOVEMENT_FEATURES),
    },
    "time_movement": {
        "numeric": list(TIME_FEATURES),
        "categorical": list(MOVEMENT_FEATURES),
    },
    "context_only_raw": {
        "numeric": list(CONTEXT_RAW_FEATURES),
        "categorical": [],
    },
    "context_only_safe": {
        "numeric": list(CONTEXT_SAFE_FEATURES),
        "categorical": [],
    },
    "legacy_context_raw": {
        "numeric": list(NUMERIC_FEATURES) + list(CONTEXT_RAW_FEATURES),
        "categorical": list(MOVEMENT_FEATURES),
    },
    "legacy_context_safe": {
        "numeric": list(NUMERIC_FEATURES) + list(CONTEXT_SAFE_FEATURES),
        "categorical": list(MOVEMENT_FEATURES),
    },
    "context_no_gap": {
        "numeric": [
            "entity_quantity_ratio_log",
            "entity_count_1h",
            "entity_hour_tail_score",
        ],
        "categorical": [],
    },
    "context_gap_indicator": {
        "numeric": list(CONTEXT_SAFE_FEATURES) + ["entity_has_prior_history"],
        "categorical": [],
    },
    "context_multi_window": {
        "numeric": list(CONTEXT_MULTI_WINDOW_FEATURES),
        "categorical": [],
    },
}

REQUIRED_COLUMNS = {
    "timestamp",
    "quantity",
    "movement_type",
    "hour",
    "day_of_week",
    "quantity_ratio",
    "is_anomaly",
    "anomaly_kind",
}


def load_dataset(source="csv", seed=RANDOM_STATE):
    """Load the existing CSV or build the corrected dataset in memory."""
    if source == "csv":
        return pd.read_csv(DATA_FILE, parse_dates=["timestamp"])
    if source == "synthetic":
        return generate_dataset(rng=np.random.default_rng(seed))
    raise ValueError("source must be 'csv' or 'synthetic'")


def prepare_data(data):
    """Sort chronologically and add row-local features without writing files."""
    missing = REQUIRED_COLUMNS - set(data.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    ordered = (
        data.sort_values("timestamp", kind="mergesort")
        .reset_index(drop=True)
        .copy()
    )

    if ordered[list(REQUIRED_COLUMNS)].isnull().any().any():
        raise ValueError("Dataset contains null values in required columns.")

    prepared = build_features(ordered)

    if CONTEXT_REQUIRED_COLUMNS.issubset(prepared.columns):
        extra_windows = tuple(
            minutes for minutes in ENTITY_COUNT_WINDOWS if minutes != 60
        )
        multi_window = causal_entity_features(
            prepared, count_windows=extra_windows
        )
        for column in multi_window.columns:
            if column.startswith("entity_count_"):
                prepared[column] = multi_window[column].to_numpy()

    return prepared


def chronological_split(data, train_frac=TRAIN_FRAC, val_frac=VAL_FRAC):
    """Split sorted rows into the first 60%, next 20%, and final 20%."""
    ordered = data.sort_values("timestamp", kind="mergesort").reset_index(
        drop=True
    )
    n_rows = len(ordered)
    train_end = int(n_rows * train_frac)
    val_end = train_end + int(n_rows * val_frac)

    if train_end <= 0 or val_end <= train_end or val_end >= n_rows:
        raise ValueError("Dataset is too small for the requested split.")

    train = ordered.iloc[:train_end].copy()
    validation = ordered.iloc[train_end:val_end].copy()
    test = ordered.iloc[val_end:].copy()
    return train, validation, test


def build_pipeline(
    numeric_features,
    categorical_features,
    contamination=CONTAMINATION,
    random_state=RANDOM_STATE,
):
    """Build the same preprocessing/IF shape used by the prototype."""
    numeric_features = list(numeric_features)
    categorical_features = list(categorical_features)

    transformers = []
    if numeric_features:
        transformers.append(("numeric", "passthrough", numeric_features))
    if categorical_features:
        transformers.append((
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features,
        ))

    if not transformers:
        raise ValueError("At least one feature column is required.")

    preprocessor = ColumnTransformer(transformers)
    isolation_forest = IsolationForest(
        n_estimators=150,
        contamination=contamination,
        random_state=random_state,
    )
    return Pipeline(
        steps=[
            ("preprocessing", preprocessor),
            ("isolation_forest", isolation_forest),
        ]
    )


def anomaly_scores(model, X):
    """Return anomaly scores: higher values always mean more anomalous."""
    return -np.asarray(model.decision_function(X), dtype=float)


def predict_at_threshold(scores, threshold):
    """Flag scores >= threshold; higher scores mean more anomalous."""
    return (np.asarray(scores, dtype=float) >= threshold).astype(int)


def classification_metrics(y_true, y_pred):
    """Calculate threshold metrics with safe zero denominators."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)

    if len(y_true) != len(y_pred):
        raise ValueError("y_true and y_pred must have the same length.")
    if len(y_true) == 0:
        raise ValueError("At least one row is required.")

    matrix = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = (int(value) for value in matrix.ravel())

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    alert_count = int(y_pred.sum())
    alert_rate = alert_count / len(y_pred)

    return {
        "TP": tp,
        "FP": fp,
        "FN": fn,
        "TN": tn,
        "precision": precision,
        "recall": recall,
        "F1": f1,
        "FPR": fpr,
        "alert_count": alert_count,
        "alert_rate": alert_rate,
        "confusion_matrix": matrix.tolist(),
    }


def average_precision(y_true, scores):
    """Return AP, or 0.0 when only one class is present."""
    y_true = np.asarray(y_true, dtype=int)
    if np.unique(y_true).size < 2:
        return 0.0
    return float(average_precision_score(y_true, scores))


def threshold_sweep(y_true, scores):
    """Build a small deterministic validation-only threshold table."""
    y_true = np.asarray(y_true, dtype=int)
    scores = np.asarray(scores, dtype=float)

    if len(y_true) != len(scores):
        raise ValueError("y_true and scores must have the same length.")
    if len(scores) == 0:
        raise ValueError("At least one score is required.")

    quantile_levels = np.linspace(0.0, 1.0, QUANTILE_POINTS)
    upper_sentinel = np.nextafter(float(np.max(scores)), np.inf)
    candidates = np.unique(
        np.concatenate([np.quantile(scores, quantile_levels), [upper_sentinel]])
    )

    rows = []
    for threshold in candidates:
        metrics = classification_metrics(y_true, predict_at_threshold(scores, threshold))
        rows.append({
            "threshold": float(threshold),
            "alert_count": metrics["alert_count"],
            "alert_rate": metrics["alert_rate"],
            "TP": metrics["TP"],
            "FP": metrics["FP"],
            "FN": metrics["FN"],
            "TN": metrics["TN"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "F1": metrics["F1"],
            "FPR": metrics["FPR"],
        })

    return pd.DataFrame(rows)


def select_threshold(threshold_table):
    """Provisional rule: maximize F1, then prefer fewer alerts."""
    if threshold_table.empty:
        raise ValueError("Threshold table is empty.")

    ranked = threshold_table.sort_values(
        ["F1", "alert_count", "threshold"],
        ascending=[False, True, False],
        kind="mergesort",
    )
    return float(ranked.iloc[0]["threshold"])


def per_category_metrics(
    metadata,
    y_true,
    y_pred,
    categories=None,
):
    """Per-category recall/support; zero-support categories return recall 0.

    With categories=None, report the anomaly kinds observed in metadata and
    exclude the normal "none" label.
    """
    frame = metadata[["anomaly_kind"]].copy()
    frame["actual"] = np.asarray(y_true, dtype=int)
    frame["predicted"] = np.asarray(y_pred, dtype=int)

    if categories is None:
        categories = [
            category
            for category in pd.unique(frame["anomaly_kind"])
            if pd.notna(category) and category != "none"
        ]
    else:
        categories = list(categories)

    rows = []
    for category in categories:
        subset = frame[
            (frame["anomaly_kind"] == category) & (frame["actual"] == 1)
        ]
        support = int(len(subset))
        detected = int((subset["predicted"] == 1).sum()) if support else 0
        rows.append({
            "category": category,
            "support": support,
            "detected": detected,
            "recall": detected / support if support else 0.0,
        })

    return pd.DataFrame(rows)


def evaluate_predictions(
    y_true,
    scores,
    threshold,
    metadata=None,
    categories=None,
):
    """Evaluate fixed predictions; AP uses scores, not the threshold."""
    y_pred = predict_at_threshold(scores, threshold)
    metrics = classification_metrics(y_true, y_pred)
    metrics["AP"] = average_precision(y_true, scores)

    category_frame = pd.DataFrame()
    if metadata is not None:
        category_frame = per_category_metrics(
            metadata, y_true, y_pred, categories=categories
        )

    return metrics, category_frame


def feature_columns(feature_group):
    """Return the exact columns required by a named feature group."""
    if feature_group not in FEATURE_GROUPS:
        raise ValueError(f"Unknown feature group: {feature_group}")
    group = FEATURE_GROUPS[feature_group]
    return list(group["numeric"]) + list(group["categorical"])


def feature_group_issue(data, feature_group):
    """Return a reason when a feature group cannot be evaluated."""
    if feature_group not in FEATURE_GROUPS:
        return f"unknown feature group: {feature_group}"

    columns = feature_columns(feature_group)
    missing = [column for column in columns if column not in data.columns]
    if missing:
        return f"missing columns: {sorted(missing)}"

    numeric_columns = FEATURE_GROUPS[feature_group]["numeric"]
    if numeric_columns:
        try:
            values = data[numeric_columns].to_numpy(dtype=float)
        except (TypeError, ValueError) as exc:
            return f"non-numeric values: {exc}"
        if values.size and not np.isfinite(values).all():
            return "non-finite numeric values"

    return None


def skipped_feature_group(name, feature_group, reason):
    """Create an explicit skip record for a feature group."""
    return {
        "name": name,
        "feature_group": feature_group,
        "reason": reason,
    }


def evaluate_model(
    name,
    train,
    validation,
    test,
    feature_group,
    contamination=CONTAMINATION,
    random_state=RANDOM_STATE,
    diagnostic=False,
):
    """Fit on train, choose threshold on validation, evaluate once on test."""
    group = FEATURE_GROUPS[feature_group]
    columns = feature_columns(feature_group)

    X_train = train[columns].copy()
    X_validation = validation[columns].copy()
    X_test = test[columns].copy()

    model = build_pipeline(
        group["numeric"],
        group["categorical"],
        contamination=contamination,
        random_state=random_state,
    )
    model.fit(X_train)

    validation_scores = anomaly_scores(model, X_validation)
    threshold_table = threshold_sweep(
        validation["is_anomaly"].to_numpy(), validation_scores
    )
    threshold = select_threshold(threshold_table)

    test_scores = anomaly_scores(model, X_test)
    metrics, categories = evaluate_predictions(
        test["is_anomaly"].to_numpy(),
        test_scores,
        threshold,
        metadata=test,
    )

    return {
        "name": name,
        "diagnostic": diagnostic,
        "kind": "model",
        "feature_group": feature_group,
        "threshold": threshold,
        "threshold_table": threshold_table,
        "metrics": metrics,
        "categories": categories,
    }


def evaluate_contextual_model(
    name,
    train,
    validation,
    test,
    feature_group,
    contamination=CONTAMINATION,
    random_state=RANDOM_STATE,
):
    """Evaluate a contextual group, skipping it explicitly when unusable."""
    issues = []
    for split_name, split in (
        ("train", train),
        ("validation", validation),
        ("test", test),
    ):
        issue = feature_group_issue(split, feature_group)
        if issue:
            issues.append(f"{split_name}: {issue}")
    if issues:
        return None, skipped_feature_group(
            name, feature_group, "; ".join(issues)
        )

    try:
        result = evaluate_model(
            name,
            train,
            validation,
            test,
            feature_group,
            contamination=contamination,
            random_state=random_state,
            diagnostic=False,
        )
    except Exception as exc:
        return None, skipped_feature_group(
            name,
            feature_group,
            f"evaluation failed: {type(exc).__name__}: {exc}",
        )

    return result, None


def random_scores(n_rows, seed):
    """Reproducible random anomaly scores; higher means more anomalous."""
    return np.random.default_rng(seed).random(n_rows)


def evaluate_score_baseline(
    name,
    train,
    validation,
    test,
    validation_scores,
    test_scores,
    diagnostic=False,
):
    """Evaluate a precomputed score column with validation-only thresholding."""
    threshold_table = threshold_sweep(
        validation["is_anomaly"].to_numpy(), validation_scores
    )
    threshold = select_threshold(threshold_table)

    metrics, categories = evaluate_predictions(
        test["is_anomaly"].to_numpy(),
        test_scores,
        threshold,
        metadata=test,
    )

    return {
        "name": name,
        "diagnostic": diagnostic,
        "kind": "score",
        "feature_group": None,
        "threshold": threshold,
        "threshold_table": threshold_table,
        "metrics": metrics,
        "categories": categories,
    }


def run_evaluation(data, seed=RANDOM_STATE):
    """Run all baselines and ablations on one shared chronological split.

    Contextual groups are skipped explicitly with reasons when their columns
    are unavailable, such as when evaluating the legacy CSV.
    """
    prepared = prepare_data(data)
    train, validation, test = chronological_split(prepared)

    results = []

    results.append(evaluate_score_baseline(
        "random",
        train,
        validation,
        test,
        random_scores(len(validation), seed),
        random_scores(len(test), seed + 1),
    ))

    results.append(evaluate_score_baseline(
        "quantity_deviation",
        train,
        validation,
        test,
        validation["quantity_deviation"].to_numpy(),
        test["quantity_deviation"].to_numpy(),
    ))

    results.append(evaluate_score_baseline(
        "off_hours",
        train,
        validation,
        test,
        validation["is_off_hours"].to_numpy(),
        test["is_off_hours"].to_numpy(),
    ))

    model_specs = [
        ("quantity_only_if", "quantity", 0.05, False),
        ("time_only_if", "time", 0.05, False),
        ("movement_type_if", "movement", 0.05, True),
        ("full_if", "full", 0.05, False),
        ("quantity_time_if", "quantity_time", 0.05, False),
        ("quantity_movement_if", "quantity_movement", 0.05, False),
        ("time_movement_if", "time_movement", 0.05, False),
    ]

    for name, group, contamination, diagnostic in model_specs:
        results.append(evaluate_model(
            name,
            train,
            validation,
            test,
            feature_group=group,
            contamination=contamination,
            random_state=seed,
            diagnostic=diagnostic,
        ))

    contextual_specs = [
        ("context_only_raw_if", "context_only_raw"),
        ("context_only_safe_if", "context_only_safe"),
        ("legacy_context_raw_if", "legacy_context_raw"),
        ("legacy_context_safe_if", "legacy_context_safe"),
        ("context_no_gap_if", "context_no_gap"),
        ("context_gap_indicator_if", "context_gap_indicator"),
        ("context_multi_window_if", "context_multi_window"),
    ]
    skipped = []
    for name, group in contextual_specs:
        result, skip = evaluate_contextual_model(
            name,
            train,
            validation,
            test,
            feature_group=group,
            contamination=CONTAMINATION,
            random_state=seed,
        )
        if result is not None:
            results.append(result)
        if skip is not None:
            skipped.append(skip)

    return {
        "split": {
            "train": train,
            "validation": validation,
            "test": test,
        },
        "results": results,
        "skipped": skipped,
    }
