from datetime import datetime, timedelta

from main import MovementRecord, PredictRequest, health_check, predict_payload


BASE_TIME = datetime(2026, 11, 1, 10, 0, 0)


def _request(quantity):
    history = [
        MovementRecord(
            id=index,
            type="IN",
            quantity=30,
            product_id="P1",
            warehouse_id="W1",
            timestamp=BASE_TIME + timedelta(days=index),
        )
        for index in range(10)
    ]
    return PredictRequest(
        movement=MovementRecord(
            id=100,
            type="IN",
            quantity=quantity,
            product_id="P1",
            warehouse_id="W1",
            timestamp=BASE_TIME + timedelta(days=10),
        ),
        history=history,
    )


def test_predict_flags_unusual_relative_quantity():
    result = predict_payload(_request(300))

    assert result.is_anomaly is True
    assert result.score >= result.threshold
    assert result.model_version == "v3"


def test_predict_keeps_normal_relative_quantity():
    result = predict_payload(_request(30))

    assert result.is_anomaly is False
    assert result.score < result.threshold


def test_predict_exposes_threshold_and_score():
    result = predict_payload(_request(300))

    assert isinstance(result.score, float)
    assert isinstance(result.threshold, float)
    assert result.threshold > 0


def test_health_reports_loaded_model_version():
    result = health_check()

    assert result["status"] == "healthy"
    assert result["model_version"] == "v3"
    assert result["threshold"] > 0
