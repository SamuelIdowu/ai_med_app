# AI Med Machine Learning & Clinical Safety Subsystem

High-speed, autonomous Python ML microservice powering local medical triage, red-flag emergency interception, wound computer vision, dense vector embeddings, and LoRA fine-tuning.

---

## 1. Quick Start

### Prerequisites
- Python 3.11 or 3.12
- Virtual environment with dependencies installed:
  ```powershell
  cd ml
  python -m venv .venv
  .venv\Scripts\pip install -e .
  ```

### Start the Service
```powershell
python cli.py serve --port 8000
```
Service runs locally on `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

---

## 2. Standalone CLI Capabilities

The `cli.py` tool allows running the ML subsystem completely decoupled from backend or mobile applications:

| Command | Description | Example |
|---|---|---|
| `serve` | Launch FastAPI server | `python cli.py serve --port 8000` |
| `curate` | Generate 35-condition tabular CSV or JSONL protocols | `python cli.py curate --tabular --split` |
| `eda` | Run Exploratory Data Analysis & export plots | `python cli.py eda` |
| `train-classical` | Train & benchmark Scikit-Learn models, save `.joblib` | `python cli.py train-classical` |
| `predict-vitals` | Predict triage urgency from live physiological vitals | `python cli.py predict-vitals --hr 140 --spo2 84` |
| `train` | Run LoRA adapter fine-tuning pipeline | `python cli.py train --epochs 3` |
| `evaluate` | Run 50-scenario comprehensive clinical safety benchmark | `python cli.py evaluate --report-file report.json` |
| `triage` | Run clinical first-aid triage on symptoms | `python cli.py triage --query "Deep bleeding cut"` |
| `vision` | Classify injury/wound photograph | `python cli.py vision --image sample.png` |
| `embed` | Compute 384-dimensional unit dense vector | `python cli.py embed --text "CPR protocol"` |

---

## 3. Classical Machine Learning & Vitals Classification

In addition to neural text and vision engines, a dedicated Scikit-Learn tabular pipeline predicts clinical urgency directly from physiological vital signs:
- **Champion Model**: `HistGradientBoostingClassifier` serialized to `models/triage_classifier.joblib` (98.14% Accuracy, 0.9770 Macro F1, sub-2ms latency).
- **Features (10)**: `respiratory_rate`, `oxygen_saturation`, `heart_rate`, `altered_mental_status`, `pain_score`, `body_temperature`, `systolic_bp`, `diastolic_bp`, `severe_bleeding`, `age`.
- **Pre-processor**: `StandardScaler` serialized to `models/feature_scaler.joblib`.
- **Safety Overrides**: Hard clinical rule thresholding in `ClassicalMLService` guarantees that critical vitals (e.g. $\text{SpO}_2 < 90\%$, Systolic $\text{BP} < 85\text{ mmHg}$, or severe active bleeding) trigger immediate emergency escalation regardless of statistical probabilities.

### REST API: `/v1/ml/triage/vitals`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "heart_rate": 142,
    "systolic_bp": 85,
    "oxygen_saturation": 84,
    "respiratory_rate": 30,
    "severe_bleeding": 0,
    "altered_mental_status": 1
  }
  ```
- **Response**:
  ```json
  {
    "triage_level": 2,
    "triage_label": "Emergency",
    "confidence": 1.0,
    "probabilities": { "Non-Urgent": 0.0, "Urgent": 0.0, "Emergency": 1.0 },
    "risk_drivers": ["Critical Hypoxemia (SpO2 84% < 90%)", "Severe Tachycardia (142 bpm)"],
    "is_emergency": true,
    "is_urgent": true,
    "latency_ms": 1.45
  }
  ```

---

## 4. Core Architecture

### Clinical Safety & Red-Flag Engine (`app/services/safety_engine.py`)
Intercepts 10 life-threatening conditions with **100% sensitivity** (0 false negatives in clinical benchmarks):
1. Anaphylaxis / Airway Compromise
2. Acute Coronary Syndrome (Heart Attack)
3. Acute Neurological Deficit (Stroke / FAST)
4. Critical Arterial Hemorrhage
5. Complete Airway Obstruction (Choking)
6. Severe Traumatic Brain Injury
7. Spinal Cord Trauma
8. Environmental Heatstroke / Hypothermia
9. Critical Full-Thickness Burns
10. Toxic Ingestion / Overdose

Includes **Contraindication Detection** (e.g. prohibiting oral liquids to unconscious persons, prohibiting foreign object removal).

### Wound Vision Engine (`app/services/vision_engine.py`)
Analyzes raw image byte streams to compute:
- **Erythema Index**: Relative red-channel intensity and peripheral inflammation.
- **Contrast Index**: Contrast variance across tissue margins to differentiate deep lacerations vs. burns.
- **Classification**: `laceration`, `abrasion`, `thermal_burn`, `contusion`, `normal_skin`.
- **Severity Grading**: `minor`, `moderate`, `severe`, `critical`.

### Triage Streaming Engine (`app/services/triage_engine.py`)
Produces protocol-driven emergency guidance with token chunk pacing for Server-Sent Events (SSE).

### Embedding Engine (`app/services/embedding_engine.py`)
Generates 384-dimensional normalized dense vectors matching Supabase `pgvector` for guideline search.

---

## 5. End-to-End Testing & Benchmarks

Run the complete test suite:
```powershell
.venv\Scripts\python.exe -m pytest tests -v
```

Tests include:
- `tests/test_e2e_server.py`: Real live socket Uvicorn E2E tests over TCP.
- `tests/benchmark_safety.py`: 50-scenario clinical sensitivity/specificity benchmark covering all 35 emergency conditions.
- `tests/test_cli.py`: Automated CLI integration test across all subcommands.
- `tests/test_vision.py`: Image classification and burn scale tests.
- `tests/test_inference.py`: In-process FastAPI client tests (including `/v1/ml/triage/vitals`).
- `tests/test_safety.py`: Condition-specific regex unit tests.
- `tests/test_train.py`: Training pipeline & LoRA config tests.
