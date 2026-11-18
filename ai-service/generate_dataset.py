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

rng = np.random.default_rng(RANDOM_STATE)


# ==========================================================
# GENERATION DES QUANTITES ET HORAIRES
# ==========================================================

def generate_normal_quantity(movement_type):
    baseline = BASE_QUANTITIES[movement_type]
    quantity = rng.lognormal(mean=np.log(baseline), sigma=0.45)
    return max(1, int(round(quantity)))


def generate_normal_hour():
    if rng.random() < 0.06:
        return int(rng.choice(OFF_HOURS))
    return int(rng.integers(7, 20))


def generate_anomalous_quantity(movement_type):
    baseline = BASE_QUANTITIES[movement_type]

    if rng.random() < 0.35:
        multiplier = rng.uniform(0.35, 0.65)
    else:
        multiplier = rng.uniform(1.8, 3.2)

    return max(1, int(round(baseline * multiplier)))


def random_timestamp(start_date, number_of_days, hour):
    day_offset = int(rng.integers(0, number_of_days))
    minute = int(rng.integers(0, 60))
    second = int(rng.integers(0, 60))

    date = pd.Timestamp(start_date) + pd.Timedelta(days=day_offset)
    return date + pd.Timedelta(hours=hour, minutes=minute, seconds=second)


# ==========================================================
# GENERATION DU DATASET
# ==========================================================

def generate_dataset():
    anomaly_count = int(TOTAL_MOVEMENTS * ANOMALY_RATE)
    normal_count = TOTAL_MOVEMENTS - anomaly_count

    start_date = pd.Timestamp("2026-01-01")
    records = []

    # Mouvements normaux
    for _ in range(normal_count):
        movement_type = str(
            rng.choice(MOVEMENT_TYPES, p=MOVEMENT_PROBABILITIES)
        )
        hour = generate_normal_hour()
        timestamp = random_timestamp(start_date, HISTORY_DAYS, hour)

        records.append({
            "timestamp": timestamp,
            "quantity": generate_normal_quantity(movement_type),
            "movement_type": movement_type,
            "is_anomaly": 0,
            "anomaly_kind": "none",
            "is_synthetic": True,
        })

    # Anomalies : 40 % quantité, 40 % horaire, 20 % combinées
    scenarios = (
        ["quantity"] * int(anomaly_count * 0.40)
        + ["time"] * int(anomaly_count * 0.40)
    )
    scenarios += ["combined"] * (anomaly_count - len(scenarios))
    rng.shuffle(scenarios)

    for scenario in scenarios:
        movement_type = str(rng.choice(MOVEMENT_TYPES))
        quantity = generate_normal_quantity(movement_type)
        hour = generate_normal_hour()

        if scenario in ("quantity", "combined"):
            quantity = generate_anomalous_quantity(movement_type)

        if scenario in ("time", "combined"):
            hour = int(rng.choice(OFF_HOURS))

        timestamp = random_timestamp(start_date, HISTORY_DAYS, hour)

        records.append({
            "timestamp": timestamp,
            "quantity": quantity,
            "movement_type": movement_type,
            "is_anomaly": 1,
            "anomaly_kind": scenario,
            "is_synthetic": True,
        })

    dataset = pd.DataFrame(records)
    dataset = dataset.sort_values("timestamp").reset_index(drop=True)

    dataset["date"] = dataset["timestamp"].dt.floor("D")
    dataset["hour"] = dataset["timestamp"].dt.hour
    dataset["day_of_week"] = dataset["timestamp"].dt.dayofweek

    # ------------------------------------------------------
    # Ratio à la moyenne historique quotidienne
    # Définition retenue :
    # quantité du mouvement / moyenne des quantités par
    # mouvement du même type, calculée sur les 30 jours
    # précédents (sans utiliser le jour courant).
    # ------------------------------------------------------

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

    # Les 30 premiers jours servent à constituer l'historique.
    # Ils ne sont pas conservés dans le dataset final.
    first_date = dataset["date"].min()
    usable_start = first_date + pd.Timedelta(days=ROLLING_WINDOW_DAYS)

    dataset = dataset[dataset["date"] >= usable_start].copy()
    dataset = dataset.dropna(subset=["daily_average_quantity"])

    dataset["quantity_ratio"] = (
        dataset["quantity"] / dataset["daily_average_quantity"]
    )

    dataset = dataset.sort_values("timestamp").reset_index(drop=True)

    # Date conservée pour le split chronologique.
    # Les colonnes de diagnostic ne seront pas données au modèle.
    return dataset


# ==========================================================
# EXECUTION
# ==========================================================

if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    dataset = generate_dataset()
    dataset.to_csv(OUTPUT_FILE, index=False)

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
    print("\nFichier :", OUTPUT_FILE)
