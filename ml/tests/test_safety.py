import pytest
from app.services.safety_engine import SafetyEngine

def test_detects_severe_anaphylaxis():
    engine = SafetyEngine()
    flags = engine.evaluate_query("My throat is closing up after a bee sting and I can't breathe")
    assert "anaphylaxis" in flags
    assert engine.requires_emergency_dispatch(flags) is True

def test_passes_minor_abrasion():
    engine = SafetyEngine()
    flags = engine.evaluate_query("Scraped my knee on gravel during a bike ride")
    assert len(flags) == 0
    assert engine.requires_emergency_dispatch(flags) is False

def test_detects_cardiac_emergency():
    engine = SafetyEngine()
    flags = engine.evaluate_query("I have crushing chest pain and pressure in chest radiating to left arm")
    assert "cardiac" in flags
    assert engine.requires_emergency_dispatch(flags) is True
    msg = engine.generate_escalation_message(flags)
    assert "CRITICAL EMERGENCY ALERT" in msg
    assert "911" in msg

def test_detects_stroke_emergency():
    engine = SafetyEngine()
    flags = engine.evaluate_query("Sudden face drooping and slurred speech")
    assert "stroke" in flags
    assert engine.requires_emergency_dispatch(flags) is True

def test_detects_massive_hemorrhage():
    engine = SafetyEngine()
    flags = engine.evaluate_query("Uncontrolled bleeding with spurting blood from thigh")
    assert "massive_hemorrhage" in flags
    assert engine.requires_emergency_dispatch(flags) is True
