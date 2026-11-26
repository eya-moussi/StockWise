import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from generate_dataset import (
    ANOMALY_RATE,
    DAY_WEIGHTS,
    FREQUENCY_WINDOW_MINUTES,
    HISTORY_DAYS,
    MOVEMENT_FACTORS,
    MOVEMENT_PROBABILITIES,
    MOVEMENT_TYPES,
    PRODUCT_IDS,
    PRODUCTS,
    RANDOM_STATE,
    ROLLING_WINDOW_DAYS,
    SCENARIO_KINDS,
    TOTAL_MOVEMENTS,
    WAREHOUSE_HOURS,
    WAREHOUSE_IDS,
    WAREHOUSE_OFF_HOURS,
    random_timestamp,
)


OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "ifc_synthetic_dataset_v2.csv"

NORMAL_CLUSTER_PLANS = 20
NORMAL_CLUSTER_REPEATS = 2
BURST_REPEATS = 5
START_DATE = pd.Timestamp("2026-01-01")


def _sample_entity(generator):
    return (
        str(generator.choice(PRODUCT_IDS)),
        str(generator.choice(WAREHOUSE_IDS)),
    )


def _sample_movement_type(generator):
    return str(generator.choice(MOVEMENT_TYPES, p=MOVEMENT_PROBABILITIES))


def _normal_quantity(product_id, movement_type, generator):
    base = (
        PRODUCTS[product_id]["base"]
        * MOVEMENT_FACTORS[movement_type]
        * generator.uniform(0.9, 1.1)
    )
    quantity = generator.lognormal(
        mean=np.log(base), sigma=PRODUCTS[product_id]["sigma"]
    )
    draw = generator.random()
    if draw < 0.05:
        quantity *= generator.uniform(1.3, 1.8)
    elif draw < 0.10:
        quantity *= generator.uniform(0.6, 0.85)
    return max(1, int(round(quantity)))


def _anomalous_quantity(product_id, movement_type, generator, mild=False):
    quantity = _normal_quantity(product_id, movement_type, generator)
    if generator.random() < 0.5:
        multiplier = (
            generator.uniform(2.0, 2.5)
            if mild
            else generator.uniform(2.5, 3.5)
        )
    else:
        multiplier = (
            generator.uniform(0.45, 0.60)
            if mild
            else generator.uniform(0.25, 0.45)
        )
    return max(1, int(round(quantity * multiplier)))


def _normal_hour(warehouse_id, generator):
    hours = WAREHOUSE_HOURS[warehouse_id]
    mode = (hours[0] + hours[-1]) / 2
    hour = generator.triangular(hours[0], mode, hours[-1])
    return int(np.clip(round(hour), hours[0], hours[-1]))


def _anomalous_hour(warehouse_id, generator):
    return int(generator.choice(WAREHOUSE_OFF_HOURS[warehouse_id]))


def _timestamp(warehouse_id, hour, generator):
    return random_timestamp(
        START_DATE, HISTORY_DAYS, hour, generator, warehouse_id
    )


def _record(timestamp, quantity, movement_type, product_id, warehouse_id, label, kind):
    return {
        "timestamp": timestamp,
        "quantity": int(quantity),
        "movement_type": movement_type,
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "is_anomaly": int(label),
        "anomaly_kind": kind,
        "is_synthetic": True,
    }


def _scenario_counts(anomaly_count):
    base = anomaly_count // len(SCENARIO_KINDS)
    remainder = anomaly_count % len(SCENARIO_KINDS)
    return {
        kind: base + (1 if index < remainder else 0)
        for index, kind in enumerate(SCENARIO_KINDS)
    }


def _plan_bursts(frequency_rows, generator):
    burst_count = int(np.ceil(frequency_rows / BURST_REPEATS))
    plans = []
    remaining = frequency_rows
    for _ in range(burst_count):
        product_id, warehouse_id = _sample_entity(generator)
        timestamp = _timestamp(
            warehouse_id, _normal_hour(warehouse_id, generator), generator
        )
        repeats = min(BURST_REPEATS, remaining)
        remaining -= repeats
        plans.append({
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "timestamp": timestamp,
            "repeats": repeats,
        })
    return plans


def _plan_normal_clusters(generator):
    plans = []
    for _ in range(NORMAL_CLUSTER_PLANS):
        product_id, warehouse_id = _sample_entity(generator)
        timestamp = _timestamp(
            warehouse_id, _normal_hour(warehouse_id, generator), generator
        )
        plans.append({
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "timestamp": timestamp,
        })
    return plans


def _add_context_columns(dataset):
    dataset["date"] = dataset["timestamp"].dt.floor("D").astype("datetime64[ns]")
    dataset["hour"] = dataset["timestamp"].dt.hour.astype("int32")
    dataset["day_of_week"] = dataset["timestamp"].dt.day_of_week.astype("int32")

    daily_average = (
        dataset.groupby(["date", "movement_type"])["quantity"]
        .mean()
        .unstack("movement_type")
    )
    all_days = pd.date_range(
        start=dataset["date"].min(), end=dataset["date"].max(), freq="D"
    )
    daily_average = daily_average.reindex(all_days)
    historical_average = (
        daily_average.rolling(window=ROLLING_WINDOW_DAYS, min_periods=7)
        .mean()
        .shift(1)
    )

    dataset["daily_average_quantity"] = np.nan
    for movement_type in MOVEMENT_TYPES:
        mask = dataset["movement_type"] == movement_type
        dataset.loc[mask, "daily_average_quantity"] = (
            dataset.loc[mask, "date"].map(historical_average[movement_type])
        )

    usable_start = dataset["date"].min() + pd.Timedelta(days=ROLLING_WINDOW_DAYS)
    dataset = dataset[dataset["date"] >= usable_start].copy()
    dataset = dataset.dropna(subset=["daily_average_quantity"])
    dataset["quantity_ratio"] = dataset["quantity"] / dataset["daily_average_quantity"]
    return dataset.sort_values("timestamp").reset_index(drop=True)


def generate_dataset_v2(generator=None):
    if generator is None:
        generator = np.random.default_rng(RANDOM_STATE)

    anomaly_count = int(TOTAL_MOVEMENTS * ANOMALY_RATE)
    normal_count = TOTAL_MOVEMENTS - anomaly_count
    counts = _scenario_counts(anomaly_count)

    bursts = _plan_bursts(counts["frequency"], generator)
    clusters = _plan_normal_clusters(generator)
    regular_normal_count = (
        normal_count
        - sum(plan["repeats"] + 1 for plan in bursts)
        - len(clusters) * (NORMAL_CLUSTER_REPEATS + 1)
    )
    if regular_normal_count < 0:
        raise ValueError("Normal budget is negative; adjust cluster settings.")

    records = []

    for _ in range(regular_normal_count):
        product_id, warehouse_id = _sample_entity(generator)
        movement_type = _sample_movement_type(generator)
        hour = _normal_hour(warehouse_id, generator)
        records.append(_record(
            _timestamp(warehouse_id, hour, generator),
            _normal_quantity(product_id, movement_type, generator),
            movement_type,
            product_id,
            warehouse_id,
            0,
            "none",
        ))

    for plan in bursts:
        movement_type = _sample_movement_type(generator)
        records.append(_record(
            plan["timestamp"],
            _normal_quantity(plan["product_id"], movement_type, generator),
            movement_type,
            plan["product_id"],
            plan["warehouse_id"],
            0,
            "none",
        ))

    for plan in clusters:
        for repeat_index in range(NORMAL_CLUSTER_REPEATS + 1):
            offset = (
                0
                if repeat_index == 0
                else int(generator.integers(1, FREQUENCY_WINDOW_MINUTES + 1))
            )
            movement_type = _sample_movement_type(generator)
            records.append(_record(
                plan["timestamp"] + pd.Timedelta(minutes=offset),
                _normal_quantity(plan["product_id"], movement_type, generator),
                movement_type,
                plan["product_id"],
                plan["warehouse_id"],
                0,
                "none",
            ))

    for _ in range(counts["quantity"]):
        product_id, warehouse_id = _sample_entity(generator)
        movement_type = _sample_movement_type(generator)
        hour = _normal_hour(warehouse_id, generator)
        records.append(_record(
            _timestamp(warehouse_id, hour, generator),
            _anomalous_quantity(product_id, movement_type, generator),
            movement_type,
            product_id,
            warehouse_id,
            1,
            "quantity",
        ))

    for _ in range(counts["timing"]):
        product_id, warehouse_id = _sample_entity(generator)
        movement_type = _sample_movement_type(generator)
        hour = _anomalous_hour(warehouse_id, generator)
        records.append(_record(
            _timestamp(warehouse_id, hour, generator),
            _normal_quantity(product_id, movement_type, generator),
            movement_type,
            product_id,
            warehouse_id,
            1,
            "timing",
        ))

    for _ in range(counts["combined"]):
        product_id, warehouse_id = _sample_entity(generator)
        movement_type = _sample_movement_type(generator)
        hour = _anomalous_hour(warehouse_id, generator)
        records.append(_record(
            _timestamp(warehouse_id, hour, generator),
            _anomalous_quantity(product_id, movement_type, generator, mild=True),
            movement_type,
            product_id,
            warehouse_id,
            1,
            "combined",
        ))

    for plan in bursts:
        for _ in range(plan["repeats"]):
            offset = int(generator.integers(1, FREQUENCY_WINDOW_MINUTES + 1))
            movement_type = _sample_movement_type(generator)
            records.append(_record(
                plan["timestamp"] + pd.Timedelta(minutes=offset),
                _normal_quantity(plan["product_id"], movement_type, generator),
                movement_type,
                plan["product_id"],
                plan["warehouse_id"],
                1,
                "frequency",
            ))

    dataset = pd.DataFrame(records)
    dataset = dataset[[
        "timestamp",
        "quantity",
        "movement_type",
        "product_id",
        "warehouse_id",
        "is_anomaly",
        "anomaly_kind",
        "is_synthetic",
    ]]
    dataset = dataset.sort_values("timestamp").reset_index(drop=True)
    dataset["timestamp"] = dataset["timestamp"].astype("datetime64[ns]")
    for column in ("movement_type", "product_id", "warehouse_id", "anomaly_kind"):
        dataset[column] = dataset[column].astype(object)
    return _add_context_columns(dataset)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Generate the calibrated StockWise synthetic dataset v2."
    )
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--seed", type=int, default=RANDOM_STATE)
    args = parser.parse_args(argv)

    dataset = generate_dataset_v2(np.random.default_rng(args.seed))

    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        dataset.to_csv(args.output, index=False)

    print("Dataset synthétique v2 généré.")
    print("Nombre de mouvements :", len(dataset))
    print("\nRépartition des classes :")
    print(dataset["is_anomaly"].value_counts())
    print("\nTypes de scénarios :")
    print(dataset["anomaly_kind"].value_counts())
    print("\nPériode :")
    print(dataset["timestamp"].min(), "->", dataset["timestamp"].max())
    print("\nStatistiques du ratio :")
    print(dataset["quantity_ratio"].describe())
    if args.output is not None:
        print("\nFichier :", args.output)


if __name__ == "__main__":
    main()
