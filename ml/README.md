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
| `curate` | Generate structured clinical instruction dataset | `python cli.py curate --split` |
| `train` | Run LoRA adapter fine-tuning pipeline | `python cli.py train --epochs 3` |
| `evaluate` | Run 30-scenario clinical safety benchmark | `python cli.py evaluate --report-file report.json` |
| `triage` | Run clinical first-aid triage on symptoms | `python cli.py triage --query "Deep bleeding cut"` |
| `vision` | Classify injury/wound photograph | `python cli.py vision --image sample.png` |
| `embed` | Compute 384-dimensional unit dense vector | `python cli.py embed --text "CPR protocol"` |

---

## 3. Core Architecture

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

## 4. End-to-End Testing & Benchmarks

Run the complete test suite:
```powershell
.venv\Scripts\python.exe -m pytest tests -v
```

Tests include:
- `tests/test_e2e_server.py`: Real live socket Uvicorn E2E tests over TCP.
- `tests/benchmark_safety.py`: 30-scenario clinical sensitivity/specificity benchmark.
- `tests/test_cli.py`: Automated CLI integration test across all subcommands.
- `tests/test_vision.py`: Image classification and burn scale tests.
- `tests/test_inference.py`: In-process FastAPI client tests.
- `tests/test_safety.py`: Condition-specific regex unit tests.
- `tests/test_train.py`: Training pipeline & LoRA config tests.
