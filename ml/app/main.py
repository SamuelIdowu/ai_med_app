from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import time

from app.config import settings
from app.services.safety_engine import SafetyEngine
from app.services.vision_engine import WoundVisionEngine
from app.services.embedding_engine import EmbeddingEngine
from app.services.triage_engine import TriageEngine

app = FastAPI(
    title="AI Med Autonomous ML Engine",
    description="High-Speed Local Python ML Subsystem for Medical Triage, Emergency Guardrails & Wound Computer Vision",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

safety_engine = SafetyEngine(strictness=settings.SAFETY_STRICTNESS)
vision_engine = WoundVisionEngine()
embedding_engine = EmbeddingEngine()
triage_engine = TriageEngine()

class TriageRequest(BaseModel):
    query: str
    symptoms: Optional[List[str]] = []

class EmbedRequest(BaseModel):
    text: str

@app.get("/health")
@app.get("/v1/ml/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "ai-med-ml",
        "version": "1.2.0",
        "safety_strictness": settings.SAFETY_STRICTNESS,
        "embedding_dim": settings.EMBEDDING_DIM
    }

@app.post("/v1/ml/triage/stream")
async def stream_triage(req: TriageRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    start_time = time.time()
    flags = safety_engine.evaluate_query(req.query)
    contraindications = safety_engine.check_contraindications(req.query)
    is_critical = safety_engine.requires_emergency_dispatch(flags)

    async def generate_chunks():
        if is_critical:
            escalation = safety_engine.generate_escalation_message(flags)
            yield f"data: {json.dumps({'delta': escalation, 'critical': True, 'flags': flags})}\n\n"

        if contraindications:
            warning_text = "\n⚠️ **CRITICAL SAFETY WARNING:** " + " ".join(contraindications) + "\n\n"
            yield f"data: {json.dumps({'delta': warning_text, 'critical': False})}\n\n"

        async for chunk in triage_engine.stream_protocol_steps(req.query, req.symptoms):
            yield f"data: {json.dumps({'delta': chunk, 'critical': False})}\n\n"

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        yield f"data: {json.dumps({'done': True, 'latency_ms': elapsed_ms, 'critical': is_critical})}\n\n"

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")

@app.post("/v1/ml/triage/evaluate")
def evaluate_triage_sync(req: TriageRequest) -> Dict[str, Any]:
    """Synchronous triage assessment endpoint."""
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    start_time = time.time()
    flags = safety_engine.evaluate_query(req.query)
    contraindications = safety_engine.check_contraindications(req.query)
    is_critical = safety_engine.requires_emergency_dispatch(flags)
    guidance = triage_engine.generate_triage_guidance(req.query, req.symptoms)

    return {
        "query": req.query,
        "is_critical": is_critical,
        "flags": flags,
        "contraindications": contraindications,
        "escalation_message": safety_engine.generate_escalation_message(flags) if is_critical else None,
        "protocol": guidance,
        "processing_time_ms": round((time.time() - start_time) * 1000, 2)
    }

@app.post("/v1/ml/vision/analyze")
async def analyze_wound(file: UploadFile = File(...)) -> Dict[str, Any]:
    start_time = time.time()
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Image file payload is empty")

    result = vision_engine.classify_wound(contents)
    result["latency_ms"] = round((time.time() - start_time) * 1000, 2)
    return result

@app.post("/v1/ml/embed")
def embed_text(payload: Dict[str, Any]) -> Dict[str, Any]:
    text = payload.get("text", "")
    vector = embedding_engine.get_embedding(text)
    return {
        "embedding": vector,
        "dimensions": len(vector)
    }
