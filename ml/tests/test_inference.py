import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-med-ml"

    res_v1 = client.get("/v1/ml/health")
    assert res_v1.status_code == 200
    assert res_v1.json()["status"] == "ok"

def test_emergency_stream_trigger():
    res = client.post("/v1/ml/triage/stream", json={"query": "Crushing chest pain and arm numbness"})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    body = res.text
    assert "CRITICAL EMERGENCY ALERT" in body or "critical" in body

def test_safe_stream_triage():
    res = client.post("/v1/ml/triage/stream", json={"query": "Scraped my knee on gravel"})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    body = res.text
    assert "done" in body

def test_embed_endpoint():
    res = client.post("/v1/ml/embed", json={"text": "CPR chest compression protocol"})
    assert res.status_code == 200
    data = res.json()
    assert "embedding" in data
    assert len(data["embedding"]) == 384
    assert data["dimensions"] == 384

def test_vision_analysis_endpoint():
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01")
    res = client.post(
        "/v1/ml/vision/analyze",
        files={"file": ("test.png", fake_image, "image/png")}
    )
    assert res.status_code == 200
    data = res.json()
    assert "classification" in data
    assert "severity_grade" in data
    assert "recommendation" in data
    assert data["confidence"] > 0
