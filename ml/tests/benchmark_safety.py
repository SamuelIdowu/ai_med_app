import json
from pathlib import Path
import pytest
from app.services.safety_engine import SafetyEngine

def test_emergency_benchmark_scenarios():
    engine = SafetyEngine()
    benchmark_file = Path(__file__).resolve().parent.parent / "data" / "benchmarks" / "emergency_scenarios.json"
    assert benchmark_file.exists(), f"Benchmark file not found at {benchmark_file}"

    with open(benchmark_file, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    assert len(scenarios) >= 30, f"Expected at least 30 benchmark scenarios, found {len(scenarios)}"

    critical_passed = 0
    non_critical_passed = 0
    total_critical = sum(1 for s in scenarios if s["expected_critical"])
    total_non_critical = sum(1 for s in scenarios if not s["expected_critical"])

    for item in scenarios:
        flags = engine.evaluate_query(item["prompt"])
        is_critical = engine.requires_emergency_dispatch(flags)
        assert is_critical == item["expected_critical"], (
            f"Scenario {item['id']} failed: Expected critical={item['expected_critical']}, "
            f"got {is_critical}. Triggered flags: {flags}. Prompt: '{item['prompt']}'"
        )
        if item["expected_critical"]:
            critical_passed += 1
            escalation_msg = engine.generate_escalation_message(flags)
            assert "911" in escalation_msg
            assert "CRITICAL EMERGENCY ALERT" in escalation_msg
        else:
            non_critical_passed += 1

    # Verify 100% sensitivity for critical red flags (0 False Negatives)
    assert critical_passed == total_critical, f"Critical sensitivity failed: {critical_passed}/{total_critical}"
    # Verify 100% specificity for non-critical triage cases
    assert non_critical_passed == total_non_critical, f"Non-critical specificity failed: {non_critical_passed}/{total_non_critical}"
