import argparse
from pathlib import Path

import numpy as np
import pandas as pd


# ==========================================================
# CONFIGURATION
# ==========================================================

RANDOM_STATE = 42
TOTAL_MOVEMENTS = 6000
ANOMALY_RATE = 0.05
HISTORY_DAYS = 210
ROLLING_WINDOW_DAYS = 30

# Kept for helper/test compatibility; the CLI never defaults to this tracked path.
OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "ifc_synthetic_dataset.csv"

BASE_QUANTITIES = {
    "IN": 30,
    "OUT": 12,
    "TRANSFER": 20,
    "CORRECTION": 5,
}

MOVEMENT_TYPES = list(BASE_QUANTITIES.keys())
MOVEMENT_PROBABILITIES = [0.30, 0.55, 0.10, 0.05]
OFF_HOURS = [0, 1, 2, 3, 4, 5, 22, 23]

# Product-level scale and variability. Ten products keeps enough support per
# entity while still providing realistic quantity diversity.
PRODUCTS = {
    "P01": {"base": 5, "sigma": 0.40},
    "P02": {"base": 8, "sigma": 0.45},
    "P03": {"base": 12, "sigma": 0.50},
    "P04": {"base": 16, "sigma": 0.45},
    "P05": {"base": 20, "sigma": 0.55},
    "P06": {"base": 25, "sigma": 0.40},
    "P07": {"base": 30, "sigma": 0.50},
    "P08": {"base": 35, "sigma": 0.45},
    "P09": {"base": 40, "sigma": 0.55},
    "P10": {"base": 50, "sigma": 0.50},
}
PRODUCT_IDS = list(PRODUCTS)

# Warehouse-specific schedules. Normal off-window activity is allowed for every
# warehouse, so global off-hours is not a label shortcut.
WAREHOUSES = {
    "WH1": {"open": 7, "close": 19, "off_prob": 0.03, "weekend_factor": 0.4},
    "WH2": {"open": 8, "close": 18, "off_prob": 0.06, "weekend_factor": 0.2},
    "WH3": {"open": 7, "close": 20, "off_prob": 0.12, "weekend_factor": 0.8},
    "WH4": {"open": 9, "close": 17, "off_prob": 0.02, "weekend_factor": 0.1},
    "WH5": {"open": 10, "close": 20, "off_prob": 0.15, "weekend_factor": 1.0},
}
WAREHOUSE_IDS = list(WAREHOUSES)

MOVEMENT_FACTORS = {
    "IN": 1.00,
    "OUT": 0.40,
    "TRANSFER": 0.70,
    "CORRECTION": 0.20,
}

SCENARIO_KINDS = ["quantity", "frequency", "timing", "combined"]

FREQUENCY_BURST_SIZE = 4
FREQUENCY_REPEATS_PER_BURST = FREQUENCY_BURST_SIZE - 1
FREQUENCY_WINDOW_MINUTES = 45

# Legitimate same-entity activity with 1-3 repeats after an initiator. The 4-row
# windows overlap frequency-burst windows, so a nearby posting is not itself a
# deterministic anomaly label.
NORMAL_BUSY_REPEAT_PATTERN = (1, 2, 3) * 10

# Kept as a backward-compatible fallback for direct helper calls.
rng = np.random.default_rng(RANDOM_STATE)


# ==========================================================
# PRECOMPUTED CONTEXT
# ==========================================================

WAREHOUSE_HOURS = {
    warehouse_id: list(range(config["open"], config["close"]))
    for warehouse_id, config in WAREHOUSES.items()
}

WAREHOUSE_OFF_HOURS = {
    warehouse_id: [hour for hour in range(24) if hour not in hours]
    for warehouse_id, hours in WAREHOUSE_HOURS.items()
}

_DAYS = np.arange(HISTORY_DAYS)
_DAY_IS_WEEKDAY = (
    (pd.Timestamp("2026-01-01") + pd.to_timedelta(_DAYS, unit="D")).dayofweek < 5
)

DAY_WEIGHTS = {}
for warehouse_id, config in WAREHOUSES.items():
    weights = np.where(
        _DAY_IS_WEEKDAY, 1.0, float(config["weekend_factor"])
    )
    DAY_WEIGHTS[warehouse_id] = weights / weights.sum()


# ==========================================================
# SMALL GENERATION HELPERS
# ==========================================================

def _sample_entity(generator):
    """Sample a product/warehouse pair independently of scenario and label."""
    product_id = str(generator.choice(PRODUCT_IDS))
    warehouse_id = str(generator.choice(WAREHOUSE_IDS))
    return product_id, warehouse_id


def _sample_movement_type(generator):
    """Sample movement type from the same distribution for every scenario."""
    return str(generator.choice(MOVEMENT_TYPES, p=MOVEMENT_PROBABILITIES))


def _quantity_multiplier(generator, mild=False):
    """
    Return an overlapping quantity multiplier.

    Normal movements include legitimate bulk (1.3-2.2x) and small
    (0.5-0.8x) quantities, so these ranges overlap normal behavior rather
    than forming a perfectly separating rule.
    """
    if mild:
        if generator.random() < 0.5:
            return float(generator.uniform(0.70, 0.90))
        return float(generator.uniform(1.20, 1.70))

    if generator.random() < 0.5:
        multiplier = generator.lognormal(mean=np.log(0.55), sigma=0.20)
        return float(np.clip(multiplier, 0.35, 0.85))

    multiplier = generator.lognormal(mean=np.log(1.70), sigma=0.22)
    return float(np.clip(multiplier, 1.15, 2.80))


def _normal_quantity(product_id, movement_type, generator):
    """Draw a product/type-aware normal quantity with legitimate tail events."""
    product = PRODUCTS[product_id]
    base = (
        product["base"]
        * MOVEMENT_FACTORS[movement_type]
        * generator.uniform(0.8, 1.2)
    )
    quantity = generator.lognormal(
        mean=np.log(base), sigma=product["sigma"]
    )

    draw = generator.random()
    if draw < 0.04:
        quantity *= generator.uniform(1.3, 2.2)
    elif draw < 0.07:
        quantity *= generator.uniform(0.5, 0.8)

    return max(1, int(round(quantity)))


def generate_normal_quantity(
    movement_type, generator=None, product_id=None, warehouse_id=None
):
    """
    Backward-compatible helper for a normal quantity.

    When entity fields are omitted, they are sampled randomly. The main
    generator passes explicit entity fields so every record stays consistent.
    """
    if generator is None:
        generator = rng
    if product_id is None:
        product_id = str(generator.choice(PRODUCT_IDS))
    if warehouse_id is None:
        warehouse_id = str(generator.choice(WAREHOUSE_IDS))

    return _normal_quantity(product_id, movement_type, generator)


def generate_anomalous_quantity(
    movement_type,
    generator=None,
    product_id=None,
    warehouse_id=None,
    mild=False,
):
    """Backward-compatible helper for an overlapping anomalous quantity."""
    if generator is None:
        generator = rng
    if product_id is None:
        product_id = str(generator.choice(PRODUCT_IDS))
    if warehouse_id is None:
        warehouse_id = str(generator.choice(WAREHOUSE_IDS))

    quantity = _normal_quantity(product_id, movement_type, generator)
    multiplier = _quantity_multiplier(generator, mild=mild)
    return max(1, int(round(quantity * multiplier)))


def generate_normal_hour(generator=None):
    """Legacy hour helper preserved for compatibility."""
    if generator is None:
        generator = rng

    if generator.random() < 0.06:
        return int(generator.choice(OFF_HOURS))
    return int(generator.integers(7, 20))


def generate_warehouse_hour(warehouse_id, generator):
    """Draw an hour from a warehouse-specific schedule."""
    config = WAREHOUSES[warehouse_id]

    if generator.random() < config["off_prob"]:
        return int(generator.choice(WAREHOUSE_OFF_HOURS[warehouse_id]))

    hours = WAREHOUSE_HOURS[warehouse_id]
    mode = (hours[0] + hours[-1]) / 2
    hour = generator.triangular(left=hours[0], mode=mode, right=hours[-1])
    return int(np.clip(round(hour), hours[0], hours[-1]))


def generate_contextual_timing_hour(warehouse_id, generator, mild=False):
    """
    Draw a contextually unusual hour relative to the warehouse schedule.

    The mixture deliberately avoids making "outside the operating window"
    equivalent to an anomaly:

    - off-window hours: unusual for this warehouse but also used by normals;
    - boundary hours: inside the window, near opening/closing;
    - inside-tail hours: inside the window but away from the normal peak.

    Combined anomalies use a milder mix with fewer off-window draws.
    """
    hours = WAREHOUSE_HOURS[warehouse_id]
    boundary_hours = [hours[0], hours[-1]]
    inside_tail_hours = sorted(
        set(hours[1:3] + hours[-3:-1]) - set(boundary_hours)
    )

    outside_probability = 0.15 if mild else 0.35
    boundary_probability = 0.30

    draw = generator.random()
    if draw < outside_probability:
        return int(generator.choice(WAREHOUSE_OFF_HOURS[warehouse_id]))
    if draw < outside_probability + boundary_probability:
        return int(generator.choice(boundary_hours))

    return int(generator.choice(inside_tail_hours))


def random_timestamp(
    start_date, number_of_days, hour, generator=None, warehouse_id=None
):
    """Generate a timestamp, optionally using warehouse day-of-week weights."""
    if generator is None:
        generator = rng

    if warehouse_id is None:
        day_offset = int(generator.integers(0, number_of_days))
    else:
        day_offset = int(
            generator.choice(number_of_days, p=DAY_WEIGHTS[warehouse_id])
        )

    minute = int(generator.integers(0, 60))
    second = int(generator.integers(0, 60))

    date = pd.Timestamp(start_date) + pd.Timedelta(days=day_offset)
    return date + pd.Timedelta(hours=hour, minutes=minute, seconds=second)


def _record(
    timestamp,
    quantity,
    movement_type,
    product_id,
    warehouse_id,
    is_anomaly,
    anomaly_kind,
):
    return {
        "timestamp": timestamp,
        "quantity": int(quantity),
        "movement_type": movement_type,
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "is_anomaly": int(is_anomaly),
        "anomaly_kind": anomaly_kind,
        "is_synthetic": True,
    }


def _scenario_counts(anomaly_count):
    """Split anomaly rows approximately equally across the four scenarios."""
    base = anomaly_count // len(SCENARIO_KINDS)
    remainder = anomaly_count % len(SCENARIO_KINDS)
    counts = {}
    for index, kind in enumerate(SCENARIO_KINDS):
        counts[kind] = base + (1 if index < remainder else 0)
    return counts


def _plan_frequency_bursts(frequency_rows, generator, start_date):
    """
    Plan burst events.

    The initiating posting is labeled normal. Only later postings in the same
    short window are labeled anomalous, so no label depends on a future event.
    """
    burst_count = int(
        np.ceil(frequency_rows / FREQUENCY_REPEATS_PER_BURST)
    )
    plans = []
    remaining = frequency_rows

    for _ in range(burst_count):
        product_id, warehouse_id = _sample_entity(generator)
        hour = generate_warehouse_hour(warehouse_id, generator)
        timestamp = random_timestamp(
            start_date, HISTORY_DAYS, hour, generator, warehouse_id
        )
        repeats = min(FREQUENCY_REPEATS_PER_BURST, remaining)
        remaining -= repeats
        plans.append({
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "timestamp": timestamp,
            "repeats": repeats,
        })

    return plans


def _plan_normal_busy_windows(generator, start_date):
    """
    Plan legitimate clustered activity.

    These windows are labeled normal even when they contain later postings,
    because an online scorer cannot know at posting time that a burst will
    continue. Varying the window size keeps them overlapping frequency bursts.
    """
    plans = []

    for repeats in NORMAL_BUSY_REPEAT_PATTERN:
        product_id, warehouse_id = _sample_entity(generator)
        hour = generate_warehouse_hour(warehouse_id, generator)
        timestamp = random_timestamp(
            start_date, HISTORY_DAYS, hour, generator, warehouse_id
        )
        plans.append({
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "timestamp": timestamp,
            "repeats": repeats,
        })

    return plans


# ==========================================================
# GENERATION DU DATASET
# ==========================================================

def generate_dataset(rng=None):
    """
    Generate the improved in-memory synthetic movement dataset.

    Scenarios
    ---------
    quantity
        Contextual large/small movement. Multipliers overlap normal legitimate
        bulk/small movements.
    frequency
        A normal initiating posting followed by 2-3 repeated postings for the
        same product/warehouse within 45 minutes. Only repeats are labeled.
    timing
        Mixed contextual hour deviation: off-window, near boundary, or inside
        the window but away from the normal peak. Off-window hours are also
        used by normal movements.
    combined
        Mild quantity deviation plus the same contextual timing mixture with
        fewer off-window draws.

    Normal movements also include legitimate same-entity busy windows with
    2-4 postings, so clustered activity alone is not an anomaly label.

    The function performs no file I/O. CSV writing occurs only in the CLI block.
    """
    if rng is None:
        rng = np.random.default_rng(RANDOM_STATE)

    anomaly_count = int(TOTAL_MOVEMENTS * ANOMALY_RATE)
    normal_count = TOTAL_MOVEMENTS - anomaly_count
    scenario_counts = _scenario_counts(anomaly_count)

    start_date = pd.Timestamp("2026-01-01")
    records = []

    burst_plans = _plan_frequency_bursts(
        scenario_counts["frequency"], rng, start_date
    )
    busy_plans = _plan_normal_busy_windows(rng, start_date)
    busy_rows = len(busy_plans) + sum(plan["repeats"] for plan in busy_plans)
    regular_normal_count = normal_count - len(burst_plans) - busy_rows

    # Normal movements.
    for _ in range(regular_normal_count):
        product_id, warehouse_id = _sample_entity(rng)
        movement_type = _sample_movement_type(rng)
        hour = generate_warehouse_hour(warehouse_id, rng)
        timestamp = random_timestamp(
            start_date, HISTORY_DAYS, hour, rng, warehouse_id
        )
        quantity = _normal_quantity(product_id, movement_type, rng)

        records.append(_record(
            timestamp,
            quantity,
            movement_type,
            product_id,
            warehouse_id,
            0,
            "none",
        ))

    # Frequency-burst initiating movements remain normal.
    for plan in burst_plans:
        movement_type = _sample_movement_type(rng)
        quantity = _normal_quantity(
            plan["product_id"], movement_type, rng
        )
        records.append(_record(
            plan["timestamp"],
            quantity,
            movement_type,
            plan["product_id"],
            plan["warehouse_id"],
            0,
            "none",
        ))

    # Normal busy periods: legitimate same-entity clustering.
    for plan in busy_plans:
        for repeat_index in range(plan["repeats"] + 1):
            offset = (
                0
                if repeat_index == 0
                else int(rng.integers(1, FREQUENCY_WINDOW_MINUTES + 1))
            )
            timestamp = plan["timestamp"] + pd.Timedelta(minutes=offset)
            movement_type = _sample_movement_type(rng)
            quantity = _normal_quantity(
                plan["product_id"], movement_type, rng
            )
            records.append(_record(
                timestamp,
                quantity,
                movement_type,
                plan["product_id"],
                plan["warehouse_id"],
                0,
                "none",
            ))

    # Contextual quantity anomalies.
    for _ in range(scenario_counts["quantity"]):
        product_id, warehouse_id = _sample_entity(rng)
        movement_type = _sample_movement_type(rng)
        hour = generate_warehouse_hour(warehouse_id, rng)
        timestamp = random_timestamp(
            start_date, HISTORY_DAYS, hour, rng, warehouse_id
        )
        quantity = generate_anomalous_quantity(
            movement_type,
            rng,
            product_id=product_id,
            warehouse_id=warehouse_id,
        )

        records.append(_record(
            timestamp,
            quantity,
            movement_type,
            product_id,
            warehouse_id,
            1,
            "quantity",
        ))

    # Contextual timing anomalies.
    for _ in range(scenario_counts["timing"]):
        product_id, warehouse_id = _sample_entity(rng)
        movement_type = _sample_movement_type(rng)
        hour = generate_contextual_timing_hour(warehouse_id, rng)
        timestamp = random_timestamp(
            start_date, HISTORY_DAYS, hour, rng, warehouse_id
        )
        quantity = _normal_quantity(product_id, movement_type, rng)

        records.append(_record(
            timestamp,
            quantity,
            movement_type,
            product_id,
            warehouse_id,
            1,
            "timing",
        ))

    # Combined subtle anomalies.
    for _ in range(scenario_counts["combined"]):
        product_id, warehouse_id = _sample_entity(rng)
        movement_type = _sample_movement_type(rng)
        hour = generate_contextual_timing_hour(
            warehouse_id, rng, mild=True
        )
        timestamp = random_timestamp(
            start_date, HISTORY_DAYS, hour, rng, warehouse_id
        )
        quantity = generate_anomalous_quantity(
            movement_type,
            rng,
            product_id=product_id,
            warehouse_id=warehouse_id,
            mild=True,
        )

        records.append(_record(
            timestamp,
            quantity,
            movement_type,
            product_id,
            warehouse_id,
            1,
            "combined",
        ))

    # Frequency anomalies: only repeated postings are labeled.
    for plan in burst_plans:
        for _ in range(plan["repeats"]):
            movement_type = _sample_movement_type(rng)
            offset = int(rng.integers(1, FREQUENCY_WINDOW_MINUTES + 1))
            timestamp = plan["timestamp"] + pd.Timedelta(minutes=offset)
            quantity = _normal_quantity(
                plan["product_id"], movement_type, rng
            )

            records.append(_record(
                timestamp,
                quantity,
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

    dataset["date"] = dataset["timestamp"].dt.floor("D")
    dataset["hour"] = dataset["timestamp"].dt.hour
    dataset["day_of_week"] = dataset["timestamp"].dt.dayofweek

    # Legacy quantity_ratio: trailing daily mean by movement type.
    # Entity-relative context features are intentionally deferred to a later
    # feature-engineering stage.
    daily_average = (
        dataset.groupby(["date", "movement_type"])["quantity"]
        .mean()
        .unstack("movement_type")
    )

    all_days = pd.date_range(
        start=dataset["date"].min(),
        end=dataset["date"].max(),
        freq="D",
    )

    daily_average = daily_average.reindex(all_days)

    historical_average = (
        daily_average
        .rolling(window=ROLLING_WINDOW_DAYS, min_periods=7)
        .mean()
        .shift(1)
    )

    dataset["daily_average_quantity"] = np.nan

    for movement_type in MOVEMENT_TYPES:
        mask = dataset["movement_type"] == movement_type
        dataset.loc[mask, "daily_average_quantity"] = (
            dataset.loc[mask, "date"].map(historical_average[movement_type])
        )

    first_date = dataset["date"].min()
    usable_start = first_date + pd.Timedelta(days=ROLLING_WINDOW_DAYS)

    dataset = dataset[dataset["date"] >= usable_start].copy()
    dataset = dataset.dropna(subset=["daily_average_quantity"])

    dataset["quantity_ratio"] = (
        dataset["quantity"] / dataset["daily_average_quantity"]
    )

    dataset = dataset.sort_values("timestamp").reset_index(drop=True)

    return dataset


# ==========================================================
# EXECUTION
# ==========================================================

def main(argv=None):
    """Generate a dataset in memory and write a CSV only when --output is given."""
    parser = argparse.ArgumentParser(
        description="Générer le dataset synthétique StockWise sans écriture par défaut."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Chemin CSV optionnel. Sans cette option, aucun fichier n'est écrit.",
    )
    args = parser.parse_args(argv)

    dataset = generate_dataset()

    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        dataset.to_csv(args.output, index=False)

    print("Dataset synthétique généré.")
    print("Nombre de mouvements :", len(dataset))
    print("\nRépartition des classes :")
    print(dataset["is_anomaly"].value_counts())
    print("\nTypes de scénarios :")
    print(dataset["anomaly_kind"].value_counts())
    print("\nPériode :")
    print(dataset["timestamp"].min(), "->", dataset["timestamp"].max())
    print("\nValeurs manquantes :")
    print(dataset.isnull().sum())
    print("\nStatistiques du ratio :")
    print(dataset["quantity_ratio"].describe())
    if args.output is not None:
        print("\nFichier :", args.output)
    else:
        print("\nFichier : aucun (CSV non écrit ; utiliser --output PATH).")


if __name__ == "__main__":
    main()
