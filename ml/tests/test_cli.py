import pytest
import subprocess
import sys
import os
from pathlib import Path
from tests.test_vision import create_synthetic_png

PYTHON_EXE = sys.executable
CLI_PATH = str(Path(__file__).resolve().parent.parent / "cli.py")

def run_cli(*args):
    cmd = [PYTHON_EXE, CLI_PATH] + list(args)
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res

def test_cli_help():
    res = run_cli("--help")
    assert res.returncode == 0
    assert "AI Med Machine Learning Standalone CLI" in res.stdout

def test_cli_curate(tmp_path):
    dataset_file = str(tmp_path / "cli_triage.jsonl")
    res = run_cli("curate", "--output", dataset_file, "--split")
    assert res.returncode == 0
    assert "Curated" in res.stdout
    assert os.path.exists(dataset_file)

def test_cli_train(tmp_path):
    checkpoint_dir = str(tmp_path / "checkpoints")
    dataset_file = str(tmp_path / "train_triage.jsonl")
    run_cli("curate", "--output", dataset_file)
    res = run_cli("train", "--dataset", dataset_file, "--checkpoint-dir", checkpoint_dir, "--epochs", "2")
    assert res.returncode == 0
    assert "TRAINING PIPELINE COMPLETED" in res.stdout
    assert os.path.exists(os.path.join(checkpoint_dir, "adapter_checkpoint.json"))

def test_cli_evaluate(tmp_path):
    report_file = str(tmp_path / "report.json")
    res = run_cli("evaluate", "--report-file", report_file)
    assert res.returncode == 0
    assert "CLINICAL BENCHMARK EVALUATION RESULTS" in res.stdout
    assert "100.0%" in res.stdout
    assert os.path.exists(report_file)

def test_cli_triage_critical():
    res = run_cli("triage", "--query", "Severe crushing chest pain and left arm pain")
    assert res.returncode == 0
    assert "CRITICAL EMERGENCY ALERT" in res.stdout
    assert "911" in res.stdout

def test_cli_triage_non_critical():
    res = run_cli("triage", "--query", "I cut my finger peeling potatoes and it is bleeding")
    assert res.returncode == 0
    assert "External Hemorrhage Control" in res.stdout
    assert "CRITICAL EMERGENCY ALERT" not in res.stdout

def test_cli_vision(tmp_path):
    img_file = str(tmp_path / "test_wound.png")
    with open(img_file, "wb") as f:
        f.write(create_synthetic_png())
    res = run_cli("vision", "--image", img_file)
    assert res.returncode == 0
    assert "Wound Vision Assessment" in res.stdout
    assert "Classification" in res.stdout

def test_cli_embed():
    res = run_cli("embed", "--text", "CPR emergency protocol")
    assert res.returncode == 0
    assert "Embedding Dimensions: 384" in res.stdout
    assert "L2 Unit Hypersphere Norm: 1.0" in res.stdout
