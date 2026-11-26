import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from generate_dataset_v2 import (
    MOVEMENT_FACTORS,
    PRODUCTS,
    RANDOM_STATE,
    _add_context_columns,
    generate_dataset_v2,
)


OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "ifc_synthetic_dataset_v3.csv"
QUANTITY_STRENGTH = 3.0
MOVEMENT_WINDOW = 60
MOVEMENT_MIN_HISTORY = 5
MOVEMENT_MAX_RATIO = 10.0


def amplify_quantity_anomalies(data, strength=QUANTITY_STRENGTH):
    expected = data["product_id"].map(
        {product_id: config["base"] for product_id, config in PRODUCTS.items()}
    ) * data["movement_type"].map(MOVEMENT_FACTORS)
    ratio = data["quantity"] / expected
    affected = data["anomaly_kind"].isin(["quantity", "combined"])
    high = affected & (ratio >= 1)
    low = affected & (ratio < 1)

    data.loc[high, "quantity"] = (
        data.loc[high, "quantity"] * strength
    ).round().astype(int)
    data.loc[low, "quantity"] = (
        data.loc[low, "quantity"] / strength
    ).round().astype(int)
    data["quantity"] = data["quantity"].clip(lower=1).astype(int)
    return _add_context_columns(data)


def add_movement_context_features(data):
    ratios = np.ones(len(data), dtype=float)
    for _, group in data.groupby(
        ["product_id", "warehouse_id", "movement_type"], sort=False
    ):
        indices = group.index.to_numpy()
        quantities = group["quantity"].to_numpy(dtype=float)
        history = []
        for position, quantity in enumerate(quantities):
            if len(history) >= MOVEMENT_MIN_HISTORY:
                baseline = float(np.median(history))
                if baseline > 0:
                    ratios[indices[position]] = float(
                        np.clip(
                            quantity / baseline, 0.0, MOVEMENT_MAX_RATIO
                        )
                    )
            history.append(quantity)
            if len(history) > MOVEMENT_WINDOW:
                history.pop(0)

    log_ratio = np.log(np.clip(ratios, 1e-6, None))
    data["entity_movement_quantity_ratio"] = ratios
    data["entity_movement_quantity_ratio_log"] = log_ratio
    data["entity_movement_quantity_deviation"] = np.abs(log_ratio)
    return data


def generate_dataset_v3(generator=None):
    if generator is None:
        generator = np.random.default_rng(RANDOM_STATE)
    return amplify_quantity_anomalies(generate_dataset_v2(generator))


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Generate the quantity-calibrated StockWise synthetic dataset v3."
    )
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--seed", type=int, default=RANDOM_STATE)
    args = parser.parse_args(argv)

    dataset = generate_dataset_v3(np.random.default_rng(args.seed))

    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        dataset.to_csv(args.output, index=False)

    print("Dataset synthétique v3 généré.")
    print("Nombre de mouvements :", len(dataset))
    print("\nRépartition des classes :")
    print(dataset["is_anomaly"].value_counts())
    print("\nTypes de scénarios :")
    print(dataset["anomaly_kind"].value_counts())
    print("\nStatistiques du ratio :")
    print(dataset["quantity_ratio"].describe())
    if args.output is not None:
        print("\nFichier :", args.output)


if __name__ == "__main__":
    main()
