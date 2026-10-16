"""Classical Machine Learning Training Pipeline for Clinical Triage.

Standard, familiar Scikit-Learn training workflow:
1. Loads tabular clinical dataset (features X, target y)
2. Stratified train/test split (80/20)
3. Standard feature scaling (StandardScaler)
4. Multi-algorithm benchmarking:
   - Logistic Regression (linear baseline)
   - Random Forest Classifier (ensemble bagged trees)
   - HistGradientBoosting (gradient boosted decision trees)
5. Comprehensive metrics evaluation (Accuracy, Precision, Recall, Macro F1, Confusion Matrix)
6. Model persistence: serializes .joblib weights and feature scaler into ml/models/
"""

import json
import os
import time
from typing import Any, Dict, List, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS: List[str] = [
    "age",
    "heart_rate",
    "systolic_bp",
    "diastolic_bp",
    "respiratory_rate",
    "oxygen_saturation",
    "body_temperature",
    "pain_score",
    "severe_bleeding",
    "altered_mental_status"
]

TARGET_COLUMN: str = "triage_level"
CLASS_NAMES: List[str] = ["Non-Urgent", "Urgent", "Emergency"]


def train_and_evaluate_triage_models(
    dataset_csv: str = "data/clinical_triage_features.csv",
    models_dir: str = "models",
    test_size: float = 0.2,
    random_state: int = 42
) -> Dict[str, Any]:
    """Trains, benchmarks, evaluates, and persists classical ML triage models."""
    if not os.path.exists(dataset_csv):
        raise FileNotFoundError(f"Dataset not found at {dataset_csv}. Run dataset generation first.")

    os.makedirs(models_dir, exist_ok=True)
    df = pd.read_csv(dataset_csv)

    # 1. Feature matrix X and target y
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    # 2. Stratified Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )

    # 3. Fit Feature Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 4. Candidate Algorithms
    candidates = {
        "LogisticRegression": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=random_state
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=4,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1
        ),
        "GradientBoosting": HistGradientBoostingClassifier(
            max_iter=100,
            max_depth=8,
            random_state=random_state
        )
    }

    benchmark_results: Dict[str, Dict[str, Any]] = {}
    best_f1 = -1.0
    best_model_name = ""
    best_model_obj = None

    for name, model in candidates.items():
        t0 = time.time()
        # Train on scaled features
        model.fit(X_train_scaled, y_train)
        fit_time = round(time.time() - t0, 3)

        # Predict
        y_pred = model.predict(X_test_scaled)

        # Evaluate
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
        rec = recall_score(y_test, y_pred, average="macro", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()
        report = classification_report(
            y_test,
            y_pred,
            target_names=CLASS_NAMES,
            output_dict=True,
            zero_division=0
        )

        benchmark_results[name] = {
            "accuracy": round(float(acc), 4),
            "precision_macro": round(float(prec), 4),
            "recall_macro": round(float(rec), 4),
            "f1_macro": round(float(f1), 4),
            "fit_time_seconds": fit_time,
            "confusion_matrix": cm,
            "classification_report": report
        }

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model_obj = model

    # 5. Extract Feature Importances (if available, e.g. Random Forest)
    rf_model = candidates["RandomForest"]
    feature_importances = {}
    if hasattr(rf_model, "feature_importances_"):
        importances = rf_model.feature_importances_
        for feat, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True):
            feature_importances[feat] = round(float(imp), 4)

    # 6. Serialize Best Model & Preprocessor Artifacts
    model_path = os.path.join(models_dir, "triage_classifier.joblib")
    scaler_path = os.path.join(models_dir, "feature_scaler.joblib")
    metrics_path = os.path.join(models_dir, "training_metrics.json")

    joblib.dump(best_model_obj, model_path)
    joblib.dump(scaler, scaler_path)

    metrics_payload = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "best_model": best_model_name,
        "feature_columns": FEATURE_COLUMNS,
        "class_names": CLASS_NAMES,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_importances": feature_importances,
        "models_benchmark": benchmark_results
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    return {
        "best_model_name": best_model_name,
        "best_macro_f1": round(float(best_f1), 4),
        "model_artifact_path": model_path,
        "scaler_artifact_path": scaler_path,
        "metrics_artifact_path": metrics_path,
        "feature_importances": feature_importances,
        "benchmark": benchmark_results
    }


def format_training_summary(result: Dict[str, Any]) -> str:
    """Formats training benchmark results as a clean terminal table."""
    best = result["best_model_name"]
    lines = [
        "=" * 74,
        " CLASSICAL ML TRAINING PIPELINE & BENCHMARK SUMMARY",
        "=" * 74,
        f"Selected Champion Model : {best} (Macro F1 = {result['best_macro_f1']:.4f})",
        f"Saved Model Artifact    : {result['model_artifact_path']}",
        f"Saved Scaler Artifact   : {result['scaler_artifact_path']}",
        "",
        "--- ALGORITHM BENCHMARK COMPARISON ---",
        f"  {'Model':<20} | {'Accuracy':>9} | {'Precision':>10} | {'Recall':>9} | {'Macro F1':>9} | {'Time (s)':>8}",
        "  " + "-" * 72
    ]

    for model_name, m in result["benchmark"].items():
        is_best = " *" if model_name == best else "  "
        lines.append(
            f"  {model_name + is_best:<20} | {m['accuracy']:>9.4f} | {m['precision_macro']:>10.4f} | "
            f"{m['recall_macro']:>9.4f} | {m['f1_macro']:>9.4f} | {m['fit_time_seconds']:>8.3f}"
        )

    lines.extend([
        "",
        "--- RANDOM FOREST FEATURE IMPORTANCES ---"
    ])
    for feat, imp in result["feature_importances"].items():
        bar = "#" * int(imp * 30)
        lines.append(f"  {feat:<22}: {imp:>6.4f}  {bar}")

    best_cm = result["benchmark"][best]["confusion_matrix"]
    lines.extend([
        "",
        f"--- CONFUSION MATRIX ({best}) ---",
        "                Pred Non-Urgent   Pred Urgent   Pred Emergency",
        f"  True Non-Urgent:  {best_cm[0][0]:>10}    {best_cm[0][1]:>10}       {best_cm[0][2]:>10}",
        f"  True Urgent:      {best_cm[1][0]:>10}    {best_cm[1][1]:>10}       {best_cm[1][2]:>10}",
        f"  True Emergency:   {best_cm[2][0]:>10}    {best_cm[2][1]:>10}       {best_cm[2][2]:>10}",
        "=" * 74
    ])
    return "\n".join(lines)


if __name__ == "__main__":
    summary = train_and_evaluate_triage_models()
    print(format_training_summary(summary))
