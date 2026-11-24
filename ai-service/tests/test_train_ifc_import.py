import hashlib
import importlib.util
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd


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


def _import_probe_script():
    return (
        "import importlib.util\n"
        "import sys\n"
        "from pathlib import Path\n"
        "import joblib\n"
        "import pandas as pd\n"
        "from sklearn.pipeline import Pipeline\n"
        "\n"
        f"sys.path.insert(0, {str(AI_SERVICE_DIR)!r})\n"
        "\n"
        "def forbidden(label):\n"
        "    def _fail(*args, **kwargs):\n"
        "        raise AssertionError('import attempted ' + label)\n"
        "    return _fail\n"
        "\n"
        "pd.read_csv = forbidden('pandas.read_csv')\n"
        "Pipeline.fit = forbidden('Pipeline.fit')\n"
        "joblib.dump = forbidden('joblib.dump')\n"
        "\n"
        f"train_path = Path({str(TRAIN_IFC_PATH)!r})\n"
        "spec = importlib.util.spec_from_file_location("
        "'train_ifc_import_probe', train_path)\n"
        "module = importlib.util.module_from_spec(spec)\n"
        "spec.loader.exec_module(module)\n"
        "assert callable(module.main)\n"
        "print('IMPORT_ONLY_OK')\n"
    )


def _run_import_probe():
    return subprocess.run(
        [sys.executable, "-B", "-c", _import_probe_script()],
        capture_output=True,
        text=True,
    )


def _sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _fake_dataset():
    timestamps = pd.date_range("2026-01-01", periods=10, freq="D")
    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "quantity": [10] * 10,
            "movement_type": ["OUT"] * 10,
            "is_anomaly": [0] * 8 + [1, 1],
            "anomaly_kind": ["none"] * 8 + ["quantity", "time"],
            "is_synthetic": [True] * 10,
            "date": [timestamp.date() for timestamp in timestamps],
            "hour": [10] * 10,
            "day_of_week": [index % 7 for index in range(10)],
            "daily_average_quantity": [10.0] * 10,
            "quantity_ratio": [1.0] * 10,
        }
    )


def _stub_training_dependencies(monkeypatch, module):
    fake_data = _fake_dataset()
    monkeypatch.setattr(
        module.pd, "read_csv", lambda *args, **kwargs: fake_data.copy()
    )
    monkeypatch.setattr(module.Pipeline, "fit", lambda self, X: self)
    monkeypatch.setattr(
        module.Pipeline,
        "predict",
        lambda self, X: np.full(len(X), -1, dtype=int),
    )
    monkeypatch.setattr(
        module.Pipeline,
        "decision_function",
        lambda self, X: np.full(len(X), 1.0),
    )


def test_import_does_not_start_training():
    result = _run_import_probe()

    assert result.returncode == 0, result.stdout + result.stderr
    assert "IMPORT_ONLY_OK" in result.stdout
    assert "Dataset chargé" not in result.stdout
    assert "Entraînement terminé" not in result.stdout
    assert "Modèle sauvegardé" not in result.stdout


def test_import_does_not_modify_saved_model():
    before = _sha256(MODEL_FILE)

    result = _run_import_probe()

    after = _sha256(MODEL_FILE)
    assert result.returncode == 0, result.stdout + result.stderr
    assert before == EXPECTED_MODEL_SHA256
    assert after == before


def test_feature_configuration_unchanged():
    module = _load_module("train_ifc_config_probe")

    assert module.RANDOM_STATE == 42
    assert module.TEST_SIZE == 0.20
    assert module.NUMERIC_FEATURES == [
        "quantity",
        "quantity_ratio",
        "quantity_deviation",
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos",
        "is_off_hours",
    ]
    assert module.CATEGORICAL_FEATURES == ["movement_type"]
    assert module.OFF_HOURS == [0, 1, 2, 3, 4, 5, 22, 23]
    assert module.DATA_FILE == module.BASE_DIR / "data" / "ifc_synthetic_dataset.csv"
    assert module.MODEL_FILE == module.BASE_DIR / "models" / "isolation_forest.joblib"


def test_preprocessing_configuration_unchanged():
    from sklearn.preprocessing import OneHotEncoder

    module = _load_module("train_ifc_preprocessing_probe")
    preprocessor = module.build_preprocessor()

    numeric_name, numeric_transformer, numeric_columns = preprocessor.transformers[0]
    categorical_name, categorical_encoder, categorical_columns = (
        preprocessor.transformers[1]
    )

    assert numeric_name == "numeric"
    assert numeric_transformer == "passthrough"
    assert numeric_columns == module.NUMERIC_FEATURES

    assert categorical_name == "categorical"
    assert isinstance(categorical_encoder, OneHotEncoder)
    assert categorical_encoder.handle_unknown == "ignore"
    assert categorical_columns == module.CATEGORICAL_FEATURES


def test_main_without_save_does_not_call_joblib_dump(monkeypatch, capsys):
    module = _load_module("train_ifc_no_save_probe")
    _stub_training_dependencies(monkeypatch, module)
    dump_calls = []
    monkeypatch.setattr(
        module.joblib,
        "dump",
        lambda *args, **kwargs: dump_calls.append((args, kwargs)),
    )

    module.main(save_model=False)

    assert dump_calls == []
    assert "Modèle non sauvegardé" in capsys.readouterr().out


def test_main_with_save_opt_in_calls_joblib_dump(monkeypatch, tmp_path, capsys):
    module = _load_module("train_ifc_save_probe")
    _stub_training_dependencies(monkeypatch, module)
    monkeypatch.setattr(module, "MODEL_DIR", tmp_path)
    monkeypatch.setattr(module, "MODEL_FILE", tmp_path / "isolation_forest.joblib")
    dump_calls = []
    monkeypatch.setattr(
        module.joblib,
        "dump",
        lambda *args, **kwargs: dump_calls.append((args, kwargs)),
    )

    module.main(save_model=True)

    assert len(dump_calls) == 1
    assert dump_calls[0][0][1] == module.MODEL_FILE
    assert "Modèle sauvegardé" in capsys.readouterr().out


def test_main_derives_categories_from_observed_evaluation(monkeypatch, capsys):
    module = _load_module("train_ifc_category_probe")
    fake_data = _fake_dataset()
    fake_data.loc[fake_data["anomaly_kind"] == "quantity", "anomaly_kind"] = "timing"
    fake_data.loc[fake_data["anomaly_kind"] == "time", "anomaly_kind"] = "frequency"

    monkeypatch.setattr(
        module.pd, "read_csv", lambda *args, **kwargs: fake_data.copy()
    )
    monkeypatch.setattr(module.Pipeline, "fit", lambda self, X: self)
    monkeypatch.setattr(
        module.Pipeline,
        "predict",
        lambda self, X: np.ones(len(X), dtype=int),
    )
    monkeypatch.setattr(
        module.Pipeline,
        "decision_function",
        lambda self, X: np.zeros(len(X)),
    )
    monkeypatch.setattr(module.joblib, "dump", lambda *args, **kwargs: None)

    module.main()

    output = capsys.readouterr().out
    assert "Catégorie : timing" in output
    assert "Catégorie : frequency" in output
    assert "Catégorie : time" not in output
