import hashlib
import importlib.util
import sys
import warnings
from pathlib import Path

import joblib
from sklearn.preprocessing import OneHotEncoder


AI_SERVICE_DIR = Path(__file__).resolve().parents[1]
TRAIN_IFC_PATH = AI_SERVICE_DIR / "train_ifc.py"
MODEL_FILE = AI_SERVICE_DIR / "models" / "isolation_forest.joblib"
EXPECTED_MODEL_SHA256 = (
    "890d1182ec16a8b90d6265e37ff5b66dab419869e21007f52750437ea416c760"
)


def _load_module(module_name):
    if str(AI_SERVICE_DIR) not in sys.path:
        sys.path.insert(0, str(AI_SERVICE_DIR))
    spec = importlib.util.spec_from_file_location(module_name, TRAIN_IFC_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_saved_model_loads_with_expected_pipeline_structure():
    module = _load_module("train_ifc_model_probe")

    assert hashlib.sha256(MODEL_FILE.read_bytes()).hexdigest() == EXPECTED_MODEL_SHA256

    with warnings.catch_warnings(record=True) as caught_warnings:
        warnings.simplefilter("always")
        model = joblib.load(MODEL_FILE)

    assert model.__class__.__name__ == "Pipeline"
    assert list(model.named_steps) == ["preprocessing", "isolation_forest"]

    preprocessor = model.named_steps["preprocessing"]
    assert preprocessor.transformers[0][2] == module.NUMERIC_FEATURES
    assert preprocessor.transformers[1][2] == module.CATEGORICAL_FEATURES
    assert isinstance(preprocessor.transformers[1][1], OneHotEncoder)
    assert preprocessor.transformers[1][1].handle_unknown == "ignore"

    isolation_forest = model.named_steps["isolation_forest"]
    assert isolation_forest.n_estimators == 150
    assert isolation_forest.contamination == 0.05
    assert isolation_forest.random_state == 42

    # Version warnings are captured and printed, not suppressed or ignored.
    seen_messages = set()
    for warning in caught_warnings:
        message = str(warning.message)
        if message not in seen_messages:
            seen_messages.add(message)
            print(f"Documented model-load warning: {message}")
