import json
from pathlib import Path
import pytest
from app.services.safety_engine import SafetyEngine

def test_emergency_benchmark_scenarios():
    engine = SafetyEngine()
    benchmark_file = Path(__file__).resolve().parent.parent / "data" / "benchmarks" / "emergency_scenarios.json"
    assert benchmark_file.exists(), f"Benchmark file not found at {benchmark_file}"

    with open(benchmark_file, "r") as f:
        scenarios = json.load(f)

    assert len(scenarios) >= 10, f"Expected at least 10 benchmark scenarios, found {len(scenarios)}"

    critical_passed = 0
    non_critical_passed = 0

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

    # Verify 100% sensitivity for critical red flags
    assert critical_passed == 6
    assert non_critical_passed == 4
