import argparse

import pandas as pd

from evaluation import load_dataset, run_evaluation


DISPLAY_COLUMNS = [
    "name",
    "AP",
    "precision",
    "recall",
    "F1",
    "TP",
    "FP",
    "FN",
    "TN",
    "FPR",
    "alert_count",
    "alert_rate",
    "threshold",
]


def split_summary(split):
    rows = []
    for name in ["train", "validation", "test"]:
        frame = split[name]
        rows.append({
            "split": name,
            "rows": len(frame),
            "anomalies": int(frame["is_anomaly"].sum()),
            "anomaly_rate": frame["is_anomaly"].mean(),
            "start": frame["timestamp"].min(),
            "end": frame["timestamp"].max(),
        })
    return pd.DataFrame(rows)


def results_table(results):
    rows = []
    for result in results:
        label = result["name"]
        if result["diagnostic"]:
            label += " (diagnostic only)"
        row = {"name": label}
        row.update(result["metrics"])
        row["threshold"] = result["threshold"]
        rows.append(row)

    table = pd.DataFrame(rows)
    return table[[column for column in DISPLAY_COLUMNS if column in table.columns]]


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate the StockWise Isolation Forest prototype."
    )
    parser.add_argument(
        "--dataset",
        choices=["csv", "synthetic"],
        default="csv",
        help=(
            "Evaluate the legacy CSV or in-memory synthetic dataset with "
            "contextual features."
        ),
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Seed for synthetic mode and model fitting.",
    )
    args = parser.parse_args()

    data = load_dataset(args.dataset, seed=args.seed)
    evaluation = run_evaluation(data, seed=args.seed)

    print("Dataset:", args.dataset)
    print("Rows:", len(data))
    print("\nChronological split")
    print(split_summary(evaluation["split"]).to_string(index=False))

    skipped = evaluation.get("skipped", [])
    if skipped:
        print("\nSkipped feature groups")
        print(pd.DataFrame(skipped)[
            ["name", "feature_group", "reason"]
        ].to_string(index=False))

    print("\nTest metrics (thresholds selected on validation only)")
    print(results_table(evaluation["results"]).round(4).to_string(index=False))

    full_result = next(
        result for result in evaluation["results"]
        if result["name"] == "full_if"
    )
    print("\nFull model validation threshold sweep")
    print(full_result["threshold_table"].round(4).to_string(index=False))

    print("\nFull model test confusion matrix")
    print(pd.DataFrame(
        full_result["metrics"]["confusion_matrix"],
        index=["actual_normal", "actual_anomaly"],
        columns=["pred_normal", "pred_anomaly"],
    ).to_string())

    print("\nFull model per-category recall")
    print(full_result["categories"].round(4).to_string(index=False))
    print("Note: per-category anomaly support is small; treat these as directional.")


if __name__ == "__main__":
    main()
