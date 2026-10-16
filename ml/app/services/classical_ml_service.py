"""Classical Machine Learning Triage Inference Service.

Loads trained Scikit-Learn model artifacts (.joblib) and scaler to provide:
- Real-time physiological triage classification (Non-Urgent, Urgent, Emergency)
- Multi-class probability distribution
- Risk driver identification (abnormal vital threshold alerts)
"""

import os
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd

CLASS_LABELS: Dict[int, str] = {
    0: "Non-Urgent",
    1: "Urgent",
    2: "Emergency"
}

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


class ClassicalMLService:
    """Inference engine for serialized classical Scikit-Learn triage models."""

    def __init__(self, models_dir: Optional[str] = None):
        if models_dir is None:
            # Default to <repo>/ml/models
            current_dir = os.path.dirname(os.path.abspath(__file__))
            models_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "models"))
        
        self.models_dir = models_dir
        self.model_path = os.path.join(models_dir, "triage_classifier.joblib")
        self.scaler_path = os.path.join(models_dir, "feature_scaler.joblib")
        self._model = None
        self._scaler = None

    def is_model_available(self) -> bool:
        return os.path.exists(self.model_path) and os.path.exists(self.scaler_path)

    def _ensure_loaded(self) -> None:
        if self._model is None or self._scaler is None:
            if not self.is_model_available():
                raise FileNotFoundError(
                    f"Classical ML model artifacts not found at {self.models_dir}. "
                    "Run `python cli.py train-classical` to generate model weights."
                )
            self._model = joblib.load(self.model_path)
            self._scaler = joblib.load(self.scaler_path)

    def extract_risk_drivers(self, vitals: Dict[str, Any]) -> List[str]:
        """Identifies clinical red flags and abnormal vital deviations."""
        drivers = []
        hr = float(vitals.get("heart_rate", 80))
        sys_bp = float(vitals.get("systolic_bp", 120))
        dia_bp = float(vitals.get("diastolic_bp", 80))
        rr = float(vitals.get("respiratory_rate", 16))
        spo2 = float(vitals.get("oxygen_saturation", 98))
        temp = float(vitals.get("body_temperature", 37.0))
        pain = int(vitals.get("pain_score", 0))
        bleeding = int(vitals.get("severe_bleeding", 0))
        altered = int(vitals.get("altered_mental_status", 0))

        if spo2 < 90.0:
            drivers.append(f"Critical Hypoxemia (SpO2 {spo2:.0f}% < 90%)")
        elif spo2 < 94.0:
            drivers.append(f"Sub-optimal Oxygenation (SpO2 {spo2:.0f}%)")

        if hr > 140.0:
            drivers.append(f"Severe Tachycardia ({hr:.0f} bpm)")
        elif hr < 45.0:
            drivers.append(f"Severe Bradycardia ({hr:.0f} bpm)")

        if sys_bp < 85.0:
            drivers.append(f"Hypotensive Shock (Systolic {sys_bp:.0f} mmHg)")
        elif sys_bp > 180.0:
            drivers.append(f"Hypertensive Crisis (Systolic {sys_bp:.0f} mmHg)")

        if rr > 32.0:
            drivers.append(f"Severe Tachypnea ({rr:.0f} breaths/min)")
        elif rr < 8.0:
            drivers.append(f"Respiratory Depression ({rr:.0f} breaths/min)")

        if temp > 40.0:
            drivers.append(f"Hyperpyrexia / Heatstroke Risk ({temp:.1f}°C)")
        elif temp < 34.0:
            drivers.append(f"Severe Hypothermia ({temp:.1f}°C)")

        if altered == 1:
            drivers.append("Altered Mental Status (Acute neurological deficit or confusion)")

        if bleeding == 1:
            drivers.append("Severe Uncontrolled Hemorrhage")

        if pain >= 8:
            drivers.append(f"Severe Pain Score ({pain}/10)")

        return drivers

    def predict(self, vitals: Dict[str, Any]) -> Dict[str, Any]:
        """Predicts triage urgency class and returns probabilities and risk drivers."""
        self._ensure_loaded()

        # Build feature DataFrame with explicit column names
        feature_df = pd.DataFrame([{
            "age": float(vitals.get("age", 42)),
            "heart_rate": float(vitals.get("heart_rate", 75)),
            "systolic_bp": float(vitals.get("systolic_bp", 120)),
            "diastolic_bp": float(vitals.get("diastolic_bp", 80)),
            "respiratory_rate": float(vitals.get("respiratory_rate", 16)),
            "oxygen_saturation": float(vitals.get("oxygen_saturation", 98)),
            "body_temperature": float(vitals.get("body_temperature", 36.8)),
            "pain_score": float(vitals.get("pain_score", 0)),
            "severe_bleeding": float(vitals.get("severe_bleeding", 0)),
            "altered_mental_status": float(vitals.get("altered_mental_status", 0)),
        }], columns=FEATURE_COLUMNS)

        scaled_vector = self._scaler.transform(feature_df)
        pred_class_idx = int(self._model.predict(scaled_vector)[0])
        pred_label = CLASS_LABELS.get(pred_class_idx, "Unknown")

        # Class probabilities
        probabilities = {}
        if hasattr(self._model, "predict_proba"):
            probs = self._model.predict_proba(scaled_vector)[0]
            for idx, p in enumerate(probs):
                probabilities[CLASS_LABELS.get(idx, f"Class {idx}")] = round(float(p), 4)

        risk_drivers = self.extract_risk_drivers(vitals)

        return {
            "triage_level": pred_class_idx,
            "triage_label": pred_label,
            "confidence": probabilities.get(pred_label, 1.0) if probabilities else 1.0,
            "probabilities": probabilities,
            "risk_drivers": risk_drivers,
            "is_emergency": pred_class_idx == 2,
            "is_urgent": pred_class_idx >= 1
        }
