import io
import pytest
from app.services.vision_engine import WoundVisionEngine

def create_synthetic_png(width=64, height=64, color=(200, 50, 50)) -> bytes:
    """Helper to generate valid PNG byte streams for testing."""
    from PIL import Image
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_handles_empty_image():
    engine = WoundVisionEngine()
    result = engine.classify_wound(b"")
    assert result["classification"] == "unknown"
    assert result["confidence"] == 0.0
    assert "Unable to process empty image" in result["recommendation"]

def test_classifies_laceration_image():
    engine = WoundVisionEngine()
    # High red, high contrast synthetic wound
    png_bytes = create_synthetic_png(width=64, height=64, color=(220, 20, 20))
    result = engine.classify_wound(png_bytes)
    assert result["classification"] in ["laceration", "thermal_burn"]
    assert result["severity_grade"] in ["moderate", "mild"]
    assert result["confidence"] > 0.8
    assert "annotations" in result

def test_classifies_normal_skin():
    engine = WoundVisionEngine()
    # Neutral, balanced skin tone (low erythema)
    png_bytes = create_synthetic_png(width=64, height=64, color=(200, 195, 190))
    result = engine.classify_wound(png_bytes)
    assert result["classification"] == "normal_skin"
    assert result["severity_grade"] == "mild"
    assert result["confidence"] >= 0.9

def test_assess_burn_severity_scale():
    engine = WoundVisionEngine()
    assert engine.assess_burn_severity(12.0, False) == "critical"
    assert engine.assess_burn_severity(6.0, True) == "critical"
    assert engine.assess_burn_severity(3.0, True) == "moderate"
    assert engine.assess_burn_severity(1.0, False) == "minor"

def test_rejects_non_medical_graphic_image():
    engine = WoundVisionEngine()
    # High-saturation green/yellow graphic/logo style image
    png_bytes = create_synthetic_png(width=64, height=64, color=(20, 160, 40))
    result = engine.classify_wound(png_bytes)
    assert result["classification"] == "non_medical_image"
    assert result["confidence"] == 0.0
    assert result["severity_grade"] == "none"
    assert "No human skin, tissue, or medical injury detected" in result["recommendation"]

