from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import asyncio

from app.services.safety_engine import SafetyEngine
from app.services.vision_engine import WoundVisionEngine
from app.services.embedding_engine import EmbeddingEngine

app = FastAPI(
    title="AI Med Local ML Engine",
    description="Local Python ML Subsystem for Medical Triage, Emergency Red-Flag Interception & Vision Analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

safety_engine = SafetyEngine()
vision_engine = WoundVisionEngine()
embedding_engine = EmbeddingEngine()

class TriageRequest(BaseModel):
    query: str
    symptoms: Optional[List[str]] = []

class EmbedRequest(BaseModel):
    text: str

@app.get("/health")
@app.get("/v1/ml/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "ai-med-ml"}

@app.post("/v1/ml/triage/stream")
async def stream_triage(req: TriageRequest):
    flags = safety_engine.evaluate_query(req.query)

    async def generate_chunks():
        if safety_engine.requires_emergency_dispatch(flags):
            escalation = safety_engine.generate_escalation_message(flags)
            yield f"data: {json.dumps({'delta': escalation, 'critical': True, 'flags': flags})}\n\n"

        advice = [
            "1. Remain seated and calm to prevent exacerbating symptoms.\n",
            "2. Ensure breathing airway is completely unobstructed.\n",
            "3. If active bleeding is present, apply continuous gentle direct pressure with clean cloth.\n"
        ]
        for item in advice:
            await asyncio.sleep(0.02)
            yield f"data: {json.dumps({'delta': item, 'critical': False})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")

@app.post("/v1/ml/vision/analyze")
async def analyze_wound(file: UploadFile = File(...)) -> Dict[str, Any]:
    contents = await file.read()
    result = vision_engine.classify_wound(contents)
    return result

@app.post("/v1/ml/embed")
def embed_text(payload: Dict[str, Any]) -> Dict[str, Any]:
    text = payload.get("text", "")
    vector = embedding_engine.get_embedding(text)
    return {"embedding": vector, "dimensions": len(vector)}
