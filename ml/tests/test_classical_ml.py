"""Tests for Classical Tabular Machine Learning, EDA, and Vitals Triage Subsystem."""

import os
import shutil
import tempfile
import pytest
import pandas as pd

from train.dataset_curator import (
    generate_clinical_tabular_dataset,
    generate_protocols_dataset,
    CONDITION_TAXONOMY
)
from eda.clinical_eda import run_clinical_eda, format_eda_summary_text
from train.train_classical_model import (
    train_and_evaluate_triage_models,
    format_training_summary,
    FEATURE_COLUMNS
)
from app.services.classical_ml_service import ClassicalMLService


@pytest.fixture(scope="module")
def temp_ml_workspace():
    """Creates an isolated temporary folder for data and model artifacts."""
    temp_dir = tempfile.mkdtemp(prefix="laso_test_classical_ml_")
    data_dir = os.path.join(temp_dir, "data")
    eda_dir = os.path.join(data_dir, "eda")
    models_dir = os.path.join(temp_dir, "models")
    os.makedirs(eda_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    yield {
        "root": temp_dir,
        "csv_path": os.path.join(data_dir, "test_clinical_features.csv"),
        "jsonl_path": os.path.join(data_dir, "test_protocols.jsonl"),
        "eda_dir": eda_dir,
        "models_dir": models_dir
    }

    shutil.rmtree(temp_dir, ignore_errors=True)


def test_tabular_dataset_generation(temp_ml_workspace):
    csv_path = temp_ml_workspace["csv_path"]
    df = generate_clinical_tabular_dataset(output_csv_path=csv_path, num_samples=350, random_seed=42)

    assert os.path.exists(csv_path)
    assert len(df) == 350
    assert df.isna().sum().sum() == 0

    expected_cols = FEATURE_COLUMNS + ["condition", "triage_level"]
    for col in expected_cols:
        assert col in df.columns

    # Verify target triage levels are in valid range [0, 1, 2]
    assert set(df["triage_level"].unique()).issubset({0, 1, 2})

    # Verify physiological vital sanity checks
    assert df["heart_rate"].min() >= 0
    assert df["heart_rate"].max() <= 240
    assert df["oxygen_saturation"].min() >= 30
    assert df["oxygen_saturation"].max() <= 100


def test_protocols_dataset_generation(temp_ml_workspace):
    jsonl_path = temp_ml_workspace["jsonl_path"]
    count = generate_protocols_dataset(output_path=jsonl_path)

    assert os.path.exists(jsonl_path)
    assert count == len(CONDITION_TAXONOMY)
    assert count >= 35


def test_clinical_eda_pipeline(temp_ml_workspace):
    csv_path = temp_ml_workspace["csv_path"]
    eda_dir = temp_ml_workspace["eda_dir"]

    report = run_clinical_eda(csv_path=csv_path, output_plot_dir=eda_dir)

    assert report["dataset_shape"]["rows"] == 350
    assert report["dataset_shape"]["columns"] == 12
    assert report["total_missing_values"] == 0
    assert "Emergency" in report["target_distribution"]

    # Verify correlations are calculated
    assert "heart_rate" in report["correlation_with_urgency"]
    assert "oxygen_saturation" in report["correlation_with_urgency"]

    # Verify exported plots
    assert len(report["exported_plots"]) == 3
    for p in report["exported_plots"]:
        assert os.path.exists(p)

    summary_text = format_eda_summary_text(report)
    assert "CLINICAL TRIAGE EXPLORATORY DATA ANALYSIS" in summary_text


def test_classical_training_and_serialization(temp_ml_workspace):
    csv_path = temp_ml_workspace["csv_path"]
    models_dir = temp_ml_workspace["models_dir"]

    result = train_and_evaluate_triage_models(
        dataset_csv=csv_path,
        models_dir=models_dir,
        test_size=0.25,
        random_state=42
    )

    assert result["best_macro_f1"] >= 0.80
    assert os.path.exists(result["model_artifact_path"])
    assert os.path.exists(result["scaler_artifact_path"])
    assert os.path.exists(result["metrics_artifact_path"])

    # Verify all 3 models evaluated
    assert "LogisticRegression" in result["benchmark"]
    assert "RandomForest" in result["benchmark"]
    assert "GradientBoosting" in result["benchmark"]

    summary_text = format_training_summary(result)
    assert "CONFUSION MATRIX" in summary_text


def test_classical_ml_inference_service(temp_ml_workspace):
    models_dir = temp_ml_workspace["models_dir"]
    service = ClassicalMLService(models_dir=models_dir)

    assert service.is_model_available()

    # Case 1: Healthy / Routine non-urgent vitals
    normal_vitals = {
        "age": 35,
        "heart_rate": 72,
        "systolic_bp": 118,
        "diastolic_bp": 78,
        "respiratory_rate": 14,
        "oxygen_saturation": 99,
        "body_temperature": 36.6,
        "pain_score": 1,
        "severe_bleeding": 0,
        "altered_mental_status": 0
    }
    pred_normal = service.predict(normal_vitals)
    assert pred_normal["triage_level"] == 0
    assert pred_normal["triage_label"] == "Non-Urgent"
    assert pred_normal["is_emergency"] is False
    assert len(pred_normal["risk_drivers"]) == 0

    # Case 2: Acute Critical Emergency Vitals
    emergency_vitals = {
        "age": 55,
        "heart_rate": 155,
        "systolic_bp": 72,
        "diastolic_bp": 45,
        "respiratory_rate": 36,
        "oxygen_saturation": 82,
        "body_temperature": 36.5,
        "pain_score": 9,
        "severe_bleeding": 1,
        "altered_mental_status": 1
    }
    pred_emergency = service.predict(emergency_vitals)
    assert pred_emergency["triage_level"] == 2
    assert pred_emergency["triage_label"] == "Emergency"
    assert pred_emergency["is_emergency"] is True
    assert len(pred_emergency["risk_drivers"]) >= 3
    assert any("Hypoxemia" in d for d in pred_emergency["risk_drivers"])
    assert any("Shock" in d for d in pred_emergency["risk_drivers"])
