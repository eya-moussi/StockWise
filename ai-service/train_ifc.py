import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from features import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    OFF_HOURS,
    build_features,
)


# ==========================================================
# 1. CONFIGURATION
# ==========================================================

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "ifc_synthetic_dataset.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_FILE = MODEL_DIR / "isolation_forest.joblib"

RANDOM_STATE = 42
TEST_SIZE = 0.20

# Covers both the legacy corpus ("time") and the improved generator ("timing").
TEMPORAL_CATEGORY_LABELS = {"time", "timing", "combined"}


def observed_categories(evaluation: pd.DataFrame) -> list:
    """Return anomaly kinds present in the evaluation frame, excluding normal."""
    return [
        category
        for category in pd.unique(evaluation["anomaly_kind"])
        if pd.notna(category) and category != "none"
    ]


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("numeric", "passthrough", NUMERIC_FEATURES),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                CATEGORICAL_FEATURES,
            ),
        ]
    )


def main(save_model: bool = False) -> None:
    # ======================================================
    # 2. CHARGEMENT ET VERIFICATION
    # ======================================================

    data = pd.read_csv(DATA_FILE, parse_dates=["timestamp"])

    required_columns = {
        "timestamp",
        "quantity",
        "movement_type",
        "hour",
        "day_of_week",
        "quantity_ratio",
        "is_anomaly",
        "anomaly_kind",
    }

    missing_columns = required_columns - set(data.columns)

    if missing_columns:
        raise ValueError(
            f"Colonnes manquantes dans le dataset : {sorted(missing_columns)}"
        )

    if data[list(required_columns)].isnull().any().any():
        raise ValueError("Le dataset contient des valeurs manquantes.")

    data = data.sort_values("timestamp").reset_index(drop=True)

    print("Dataset chargé :", data.shape)
    print("Période :", data["timestamp"].min(), "->", data["timestamp"].max())


    # ======================================================
    # 3. PREPROCESSING TEMPOREL
    # ======================================================

    data = build_features(data)

    X = data[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = data["is_anomaly"].astype(int)


    # ======================================================
    # 4. SEPARATION CHRONOLOGIQUE TRAIN / TEST
    # ======================================================

    split_index = int(len(data) * (1 - TEST_SIZE))

    if split_index <= 0 or split_index >= len(data):
        raise ValueError("Taille insuffisante pour effectuer le split.")

    X_train = X.iloc[:split_index].copy()
    X_test = X.iloc[split_index:].copy()

    y_train = y.iloc[:split_index].copy()
    y_test = y.iloc[split_index:].copy()

    test_metadata = data.iloc[split_index:][
        ["timestamp", "anomaly_kind"]
    ].copy()

    print("\nSéparation chronologique :")
    print("Entraînement :", len(X_train))
    print("Test :", len(X_test))
    print("Fin de la période train :", data.iloc[split_index - 1]["timestamp"])
    print("Début de la période test :", data.iloc[split_index]["timestamp"])
    print("\nAnomalies dans train :", int(y_train.sum()))
    print("Anomalies dans test :", int(y_test.sum()))


    # ======================================================
    # 5. PREPROCESSING AUTOMATIQUE
    # ======================================================

    preprocessor = build_preprocessor()


    # ======================================================
    # 6. MODELE ISOLATION FOREST (IF-C)
    # ======================================================

    isolation_forest = IsolationForest(
        n_estimators=150,
        contamination=0.05,
        random_state=RANDOM_STATE,
    )

    model = Pipeline(
        steps=[
            ("preprocessing", preprocessor),
            ("isolation_forest", isolation_forest),
        ]
    )


    # ======================================================
    # 7. ENTRAINEMENT NON SUPERVISE
    # ======================================================

    # Les étiquettes y_train ne sont volontairement pas utilisées.
    model.fit(X_train)

    print("\nEntraînement terminé.")


    # ======================================================
    # 8. EVALUATION
    # ======================================================

    # Isolation Forest : 1 = normal ; -1 = anomalie
    raw_predictions = model.predict(X_test)
    predictions = np.where(raw_predictions == -1, 1, 0)

    print("\nMatrice de confusion (lignes = réel, colonnes = prédit) :")
    print(confusion_matrix(y_test, predictions, labels=[0, 1]))

    print("\nRapport de classification :")
    print(
        classification_report(
            y_test,
            predictions,
            labels=[0, 1],
            target_names=["Normal", "Anomalie"],
            zero_division=0,
        )
    )

    # decision_function : plus le score est faible, plus le point
    # est considéré comme anormal. On inverse donc le score pour
    # calculer l'Average Precision des anomalies.
    anomaly_scores = -model.decision_function(X_test)

    if y_test.nunique() == 2:
        pr_auc = average_precision_score(y_test, anomaly_scores)
        print(f"Average Precision (anomalies) : {pr_auc:.4f}")
    else:
        print("Average Precision non calculable : une seule classe dans le test.")



    # ======================================================
    # 9. ANALYSE DETAILLEE DES ERREURS
    # ======================================================

    evaluation = data.iloc[split_index:][
        [
            "timestamp",
            "quantity",
            "movement_type",
            "hour",
            "day_of_week",
            "quantity_ratio",
            "anomaly_kind",
        ]
    ].copy()

    evaluation["actual"] = y_test.to_numpy()
    evaluation["predicted"] = predictions
    evaluation["anomaly_score"] = anomaly_scores

    # ------------------------------------------------------
    # A. Evaluation par categorie
    # ------------------------------------------------------

    print("\nEvaluation par catégorie :")

    categories = observed_categories(evaluation)
    temporal_categories = [
        category
        for category in categories
        if category in TEMPORAL_CATEGORY_LABELS
    ]

    for category in categories:

        subset = evaluation[
            (evaluation["anomaly_kind"] == category)
            & (evaluation["actual"] == 1)
        ]

        total = len(subset)
        detected = int((subset["predicted"] == 1).sum())
        missed = total - detected
        recall = detected / total if total else 0.0

        print(f"\nCatégorie : {category}")
        print(f"Anomalies réelles : {total}")
        print(f"Détectées : {detected}")
        print(f"Non détectées : {missed}")
        print(f"Recall : {recall:.3f}")

    # ------------------------------------------------------
    # B. Faux positifs
    # ------------------------------------------------------

    false_positives = evaluation[
        (evaluation["actual"] == 0)
        & (evaluation["predicted"] == 1)
    ]

    print("\n===== FAUX POSITIFS =====")
    print("Nombre :", len(false_positives))

    print(
        false_positives.sort_values(
            "anomaly_score"
        ).head(15).to_string(index=False)
    )

    # ------------------------------------------------------
    # C. Faux negatifs
    # ------------------------------------------------------

    false_negatives = evaluation[
        (evaluation["actual"] == 1)
        & (evaluation["predicted"] == 0)
    ]

    print("\n===== FAUX NEGATIFS =====")
    print("Nombre :", len(false_negatives))

    print(
        false_negatives.sort_values(
            "anomaly_score",
            ascending=False
        ).head(15).to_string(index=False)
    )

    # ------------------------------------------------------
    # D. PROFIL DES ERREURS
    # ------------------------------------------------------

    for name, subset in [
        ("FAUX POSITIFS", false_positives),
        ("FAUX NEGATIFS", false_negatives),
    ]:
        print(f"\n===== PROFIL : {name} =====")

        print("\nRépartition par type de mouvement :")
        print(subset["movement_type"].value_counts())

        print("\nRépartition par heure :")
        print(subset["hour"].value_counts().sort_index())

        print("\nStatistiques des quantités :")
        print(subset["quantity"].describe())

        print("\nStatistiques des ratios :")
        print(subset["quantity_ratio"].describe())

        print("\nStatistiques des scores :")
        print(subset["anomaly_score"].describe())
    # ------------------------------------------------------
    # E. ANALYSE DES HORAIRES SELON LE TYPE D'ANOMALIE
    # ------------------------------------------------------

    print("\n===== ANALYSE DES HORAIRES =====")

    print("\nRépartition des heures pour les mouvements normaux :")

    print(
        evaluation[evaluation["actual"] == 0]["hour"]
        .value_counts()
        .sort_index()
    )

    print("\nRépartition des heures pour les anomalies temporelles :")

    print(
        evaluation[
            (evaluation["actual"] == 1) &
            (evaluation["anomaly_kind"].isin(temporal_categories))
        ]["hour"]
        .value_counts()
        .sort_index()
    )
    print("\n===== FIN DE L'ANALYSE =====")


    # ======================================================
    # 10. SAUVEGARDE (OPT-IN)
    # ======================================================

    if save_model:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_FILE)

        print("\nModèle sauvegardé :", MODEL_FILE)
    else:
        print("\nModèle non sauvegardé (utiliser --save-model pour l'enregistrer).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Entraîner et évaluer le modèle Isolation Forest StockWise."
    )
    parser.add_argument(
        "--save-model",
        action="store_true",
        help="Enregistrer explicitement le modèle entraîné dans MODEL_FILE.",
    )
    args = parser.parse_args()

    main(save_model=args.save_model)
