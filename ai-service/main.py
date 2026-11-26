import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

from features import causal_entity_features
from generate_dataset_v3 import add_movement_context_features


BASE_DIR = Path(__file__).resolve().parent
MODEL_FILE = BASE_DIR / "models" / "isolation_forest_v3.joblib"
CONFIG_FILE = BASE_DIR / "models" / "inference_config_v3.json"

MovementType = Literal[
    "IN",
    "OUT",
    "TRANSFER",
    "RETURN_CLIENT",
    "RETURN_SUPPLIER",
    "CORRECTION",
]


class MovementRecord(BaseModel):
    id: int | None = None
    type: MovementType
    quantity: int
    product_id: str
    warehouse_id: str
    timestamp: datetime


class PredictRequest(BaseModel):
    movement: MovementRecord
    history: list[MovementRecord] = Field(default_factory=list)


class PredictResponse(BaseModel):
    score: float
    threshold: float
    is_anomaly: bool
    model_version: str


app = FastAPI(
    title="StockWise AI Service",
    description="Service intelligent de gestion de stock",
    version="1.0.0",
)


@lru_cache(maxsize=1)
def _load_artifacts():
    config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    model = joblib.load(MODEL_FILE)
    return model, config


def _records_to_frame(records: list[MovementRecord]) -> pd.DataFrame:
    rows = [
        {
            "timestamp": record.timestamp,
            "quantity": record.quantity,
            "movement_type": record.type,
            "product_id": str(record.product_id),
            "warehouse_id": str(record.warehouse_id),
        }
        for record in records
    ]
    frame = pd.DataFrame(
        rows,
        columns=[
            "timestamp",
            "quantity",
            "movement_type",
            "product_id",
            "warehouse_id",
        ],
    )
    timestamps = pd.to_datetime(frame["timestamp"], errors="coerce")
    if isinstance(timestamps.dtype, pd.DatetimeTZDtype):
        timestamps = timestamps.dt.tz_localize(None)
    frame["timestamp"] = timestamps
    return frame


def _build_feature_row(request: PredictRequest, features: list[str]) -> pd.DataFrame:
    ordered_history = sorted(request.history, key=lambda item: item.timestamp)
    frame = _records_to_frame(ordered_history + [request.movement])

    context = causal_entity_features(frame, count_windows=(60,))
    frame["entity_count_1h"] = context["entity_count_1h"].to_numpy()
    frame["entity_hour_tail_score"] = context["entity_hour_tail_score"].to_numpy()

    frame = add_movement_context_features(frame)
    return frame.iloc[[-1]][features]


def predict_payload(request: PredictRequest) -> PredictResponse:
    model, config = _load_artifacts()
    features = list(config["numeric_features"])
    X = _build_feature_row(request, features)
    score = float(-model.decision_function(X)[0])
    threshold = float(config["threshold"])
    return PredictResponse(
        score=score,
        threshold=threshold,
        is_anomaly=score >= threshold,
        model_version="v3",
    )


@app.get("/")
def home():
    return {
        "message": "Bienvenue dans StockWise AI Service"
    }


@app.get("/health")
def health_check():
    _, config = _load_artifacts()
    return {
        "status": "healthy",
        "service": "StockWise AI Service",
        "model_version": "v3",
        "threshold": config["threshold"],
    }


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    return predict_payload(request)
