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
    assert data["service"] == "laso-ml"

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

def test_vitals_triage_endpoint_normal():
    payload = {
        "heart_rate": 70.0,
        "systolic_bp": 118.0,
        "diastolic_bp": 78.0,
        "respiratory_rate": 14.0,
        "oxygen_saturation": 99.0,
        "body_temperature": 36.6,
        "pain_score": 1,
        "severe_bleeding": 0,
        "altered_mental_status": 0,
        "age": 32
    }
    res = client.post("/v1/ml/triage/vitals", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["triage_label"] == "Non-Urgent"
    assert data["is_emergency"] is False
    assert "probabilities" in data
    assert "latency_ms" in data

def test_vitals_triage_endpoint_emergency():
    payload = {
        "heart_rate": 160.0,
        "systolic_bp": 70.0,
        "diastolic_bp": 40.0,
        "respiratory_rate": 38.0,
        "oxygen_saturation": 81.0,
        "body_temperature": 36.4,
        "pain_score": 9,
        "severe_bleeding": 1,
        "altered_mental_status": 1,
        "age": 58
    }
    res = client.post("/v1/ml/triage/vitals", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["triage_label"] == "Emergency"
    assert data["is_emergency"] is True
    assert len(data["risk_drivers"]) >= 3
