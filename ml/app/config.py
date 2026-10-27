from pydantic import BaseModel
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class MLConfig(BaseModel):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    SAFETY_STRICTNESS: str = os.getenv("SAFETY_STRICTNESS", "high")
    DATASET_PATH: str = os.getenv("DATASET_PATH", str(BASE_DIR / "data" / "triage_dataset.jsonl"))
    BENCHMARK_PATH: str = os.getenv("BENCHMARK_PATH", str(BASE_DIR / "data" / "benchmarks" / "emergency_scenarios.json"))
    CHECKPOINT_DIR: str = os.getenv("CHECKPOINT_DIR", str(BASE_DIR / "artifacts" / "checkpoints"))
    MODEL_NAME: str = os.getenv("MODEL_NAME", "laso-triage-v1")
    EMBEDDING_DIM: int = 384
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

settings = MLConfig()
