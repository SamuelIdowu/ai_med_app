import time
import socket
import threading
import io
import pytest
import httpx
import uvicorn
from app.main import app
from tests.test_vision import create_synthetic_png

def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

@pytest.fixture(scope="module")
def live_server_url():
    port = find_free_port()
    config = uvicorn.Config(app=app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    base_url = f"http://127.0.0.1:{port}"

    # Wait for server readiness
    ready = False
    for _ in range(50):
        try:
            r = httpx.get(f"{base_url}/health", timeout=1.0)
            if r.status_code == 200:
                ready = True
                break
        except Exception:
            time.sleep(0.1)

    assert ready, f"Live server failed to boot on port {port}"

    yield base_url

    # Graceful shutdown
    server.should_exit = True
    thread.join(timeout=3.0)

def test_live_server_health(live_server_url):
    with httpx.Client(base_url=live_server_url) as client:
        res = client.get("/v1/ml/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["service"] == "laso-ml"
        assert data["version"] == "1.3.0"

def test_live_server_triage_stream_e2e(live_server_url):
    payload = {"query": "Patient is choking on hard candy, lips turning blue and cannot cough"}
    with httpx.Client(base_url=live_server_url, timeout=10.0) as client:
        with client.stream("POST", "/v1/ml/triage/stream", json=payload) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")

            accumulated_chunks = []
            for line in response.iter_lines():
                if line.startswith("data: "):
                    accumulated_chunks.append(line)

            full_stream_text = "\n".join(accumulated_chunks)
            assert "CRITICAL EMERGENCY ALERT" in full_stream_text
            assert "911" in full_stream_text
            assert "done" in full_stream_text

def test_live_server_sync_triage_evaluate_e2e(live_server_url):
    payload = {"query": "Burned fingers on hot frying pan with red skin"}
    with httpx.Client(base_url=live_server_url) as client:
        res = client.post("/v1/ml/triage/evaluate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_critical"] is False
        assert "Thermal Burn Management" in data["protocol"]["protocol_name"]
        assert len(data["protocol"]["steps"]) > 0
        assert data["processing_time_ms"] >= 0.0

def test_live_server_vision_multipart_upload_e2e(live_server_url):
    png_bytes = create_synthetic_png(width=128, height=128, color=(210, 40, 40))
    with httpx.Client(base_url=live_server_url) as client:
        files = {"file": ("wound_live.png", io.BytesIO(png_bytes), "image/png")}
        res = client.post("/v1/ml/vision/analyze", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["classification"] in ["laceration", "thermal_burn"]
        assert data["confidence"] > 0.8
        assert "recommendation" in data
        assert "latency_ms" in data

def test_live_server_embed_e2e(live_server_url):
    with httpx.Client(base_url=live_server_url) as client:
        res = client.post("/v1/ml/embed", json={"text": "Acute respiratory distress protocol"})
        assert res.status_code == 200
        data = res.json()
        assert len(data["embedding"]) == 384
        assert data["dimensions"] == 384
