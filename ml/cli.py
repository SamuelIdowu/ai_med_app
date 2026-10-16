#!/usr/bin/env python3
"""AI Med ML Subsystem - Standalone CLI Interface.

Usage:
    python cli.py serve [--host HOST] [--port PORT] [--reload]
    python cli.py curate [--output PATH] [--split]
    python cli.py train [--epochs N] [--lr LR] [--checkpoint-dir DIR]
    python cli.py evaluate [--scenarios-file FILE] [--report-file FILE]
    python cli.py triage --query "text" [--symptoms s1 s2]
    python cli.py vision --image "path/to/image.png"
    python cli.py embed --text "medical text"
"""

import argparse
import json
import sys
import os
import time
import io
from pathlib import Path

# Safe UTF-8 standard output wrapper on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import settings
from app.services.safety_engine import SafetyEngine
from app.services.vision_engine import WoundVisionEngine
from app.services.embedding_engine import EmbeddingEngine
from app.services.triage_engine import TriageEngine
from train.dataset_curator import create_synthetic_dataset, create_dataset_splits
from train.finetune_lora import run_training_pipeline

def cmd_serve(args):
    import uvicorn
    host = args.host or settings.HOST
    port = args.port or settings.PORT
    print(f"[SERVER] Starting AI Med ML Service on http://{host}:{port}...")
    uvicorn.run("app.main:app", host=host, port=port, reload=args.reload)

def cmd_curate(args):
    output_path = args.output or settings.DATASET_PATH
    print(f"[DATA] Curating clinical triage dataset -> {output_path}...")
    count = create_synthetic_dataset(output_path)
    print(f"[SUCCESS] Curated {count} clinical instruction samples.")

    if args.split:
        data_dir = os.path.dirname(output_path) or "data"
        train_cnt, val_cnt = create_dataset_splits(data_dir)
        print(f"[SPLIT] Created dataset splits: {train_cnt} train, {val_cnt} validation.")

def cmd_train(args):
    dataset_path = args.dataset or settings.DATASET_PATH
    checkpoint_dir = args.checkpoint_dir or settings.CHECKPOINT_DIR
    epochs = args.epochs or 3
    lr = args.lr or 2e-4

    print(f"[TRAIN] Launching LoRA Training Pipeline...")
    print(f"   • Dataset: {dataset_path}")
    print(f"   • Epochs: {epochs}")
    print(f"   • Checkpoint directory: {checkpoint_dir}")

    manifest = run_training_pipeline(
        dataset_path=dataset_path,
        output_dir=checkpoint_dir,
        epochs=epochs,
        learning_rate=lr
    )

    print("==================================================")
    print("[SUCCESS] TRAINING PIPELINE COMPLETED")
    print(f"   • Final Loss: {manifest['final_loss']}")
    print(f"   • Samples Trained: {manifest['sample_count']}")
    print(f"   • Checkpoint: {checkpoint_dir}/adapter_checkpoint.json")
    print("==================================================")

def cmd_evaluate(args):
    benchmark_file = args.scenarios_file or settings.BENCHMARK_PATH
    print(f"[BENCHMARK] Running Clinical Safety & Red-Flag Benchmark: {benchmark_file}...")

    if not os.path.exists(benchmark_file):
        print(f"[ERROR] Benchmark file not found: {benchmark_file}")
        sys.exit(1)

    with open(benchmark_file, "r", encoding="utf-8") as f:
        scenarios = json.load(f)

    engine = SafetyEngine()
    passed = 0
    failed = 0
    critical_passed = 0
    non_critical_passed = 0
    total_critical = sum(1 for s in scenarios if s.get("expected_critical"))
    total_non_critical = len(scenarios) - total_critical

    results = []

    for item in scenarios:
        flags = engine.evaluate_query(item["prompt"])
        is_crit = engine.requires_emergency_dispatch(flags)
        expected = item.get("expected_critical", False)

        success = (is_crit == expected)
        if success:
            passed += 1
            if expected:
                critical_passed += 1
            else:
                non_critical_passed += 1
        else:
            failed += 1

        results.append({
            "id": item["id"],
            "prompt": item["prompt"],
            "expected_critical": expected,
            "actual_critical": is_crit,
            "flags": flags,
            "passed": success
        })

    sensitivity = (critical_passed / total_critical * 100) if total_critical else 100.0
    specificity = (non_critical_passed / total_non_critical * 100) if total_non_critical else 100.0

    print("==================================================")
    print("CLINICAL BENCHMARK EVALUATION RESULTS")
    print("==================================================")
    print(f"Total Scenarios Tested : {len(scenarios)}")
    print(f"Scenarios Passed       : {passed} / {len(scenarios)} ({round(passed/len(scenarios)*100, 1)}%)")
    print(f"Failed Scenarios       : {failed}")
    print(f"Critical Sensitivity   : {round(sensitivity, 2)}% (0 False Negatives Target: {'PASS' if sensitivity == 100.0 else 'FAIL'})")
    print(f"Non-Crit Specificity   : {round(specificity, 2)}%")
    print("==================================================")

    if args.report_file:
        with open(args.report_file, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": time.time(),
                "total": len(scenarios),
                "passed": passed,
                "sensitivity": sensitivity,
                "specificity": specificity,
                "results": results
            }, f, indent=2)
        print(f"[REPORT] Full report saved to: {args.report_file}")

    if sensitivity < 100.0 or failed > 0:
        sys.exit(1)

def cmd_triage(args):
    query = args.query
    symptoms = args.symptoms or []
    print(f"\n[TRIAGE] Query: \"{query}\"")
    if symptoms:
        print(f"   Symptoms: {', '.join(symptoms)}")

    safety = SafetyEngine()
    triage = TriageEngine()

    flags = safety.evaluate_query(query)
    contraindications = safety.check_contraindications(query)
    is_crit = safety.requires_emergency_dispatch(flags)

    print("\n---------------- Triage Assessment ----------------")
    if is_crit:
        print(safety.generate_escalation_message(flags))
        print("--------------------------------------------------")

    if contraindications:
        print("\n[WARNING] CONTRAINDICATIONS:")
        for warn in contraindications:
            print(f"   • {warn}")

    guidance = triage.generate_triage_guidance(query, symptoms)
    print(f"\nRecommended Protocol: {guidance['protocol_name']}")
    print("\nStep-by-Step Emergency Actions:")
    for i, step in enumerate(guidance["steps"], 1):
        print(f"  {i}. {step}")

    if guidance.get("red_flags"):
        print("\nKey Red Flags to Monitor:")
        for rf in guidance["red_flags"]:
            print(f"  • {rf}")

def cmd_vision(args):
    img_path = args.image
    if not os.path.exists(img_path):
        print(f"[ERROR] Image file not found: {img_path}")
        sys.exit(1)

    print(f"\n[VISION] Analyzing wound/injury photograph: {img_path}")
    with open(img_path, "rb") as f:
        image_bytes = f.read()

    engine = WoundVisionEngine()
    result = engine.classify_wound(image_bytes)

    print("\n---------------- Wound Vision Assessment ----------------")
    print(f"Classification : {result['classification'].upper()}")
    print(f"Severity Grade : {result['severity_grade'].upper()}")
    print(f"Confidence     : {round(result['confidence'] * 100, 1)}%")
    print(f"\nClinical Guidance:\n{result['recommendation']}")

    if result.get("red_flags"):
        print("\nInfection & Red Flags:")
        for rf in result["red_flags"]:
            print(f"  • {rf}")

    if result.get("annotations"):
        print("\nImage Metrics:")
        for k, v in result["annotations"].items():
            print(f"  • {k}: {v}")

def cmd_embed(args):
    text = args.text
    engine = EmbeddingEngine()
    vector = engine.get_embedding(text)
    norm = sum(v * v for v in vector) ** 0.5
    print(f"\n[EMBED] Text: \"{text}\"")
    print(f"Embedding Dimensions: {len(vector)}")
    print(f"L2 Unit Hypersphere Norm: {round(norm, 4)}")
    print(f"Sample values (first 6): {vector[:6]}")

def main():
    parser = argparse.ArgumentParser(description="AI Med Machine Learning Standalone CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # serve
    p_serve = subparsers.add_parser("serve", help="Launch FastAPI Uvicorn server")
    p_serve.add_argument("--host", default=None, help="Host address (default 0.0.0.0)")
    p_serve.add_argument("--port", type=int, default=None, help="Port (default 8000)")
    p_serve.add_argument("--reload", action="store_true", help="Enable hot reload")
    p_serve.set_defaults(func=cmd_serve)

    # curate
    p_curate = subparsers.add_parser("curate", help="Curate training dataset")
    p_curate.add_argument("--output", default=None, help="Output path for JSONL dataset")
    p_curate.add_argument("--split", action="store_true", help="Generate train/val splits")
    p_curate.set_defaults(func=cmd_curate)

    # train
    p_train = subparsers.add_parser("train", help="Run LoRA training pipeline")
    p_train.add_argument("--dataset", default=None, help="Path to JSONL dataset")
    p_train.add_argument("--checkpoint-dir", default=None, help="Output checkpoint directory")
    p_train.add_argument("--epochs", type=int, default=3, help="Training epochs")
    p_train.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    p_train.set_defaults(func=cmd_train)

    # evaluate
    p_eval = subparsers.add_parser("evaluate", help="Run clinical safety benchmark")
    p_eval.add_argument("--scenarios-file", default=None, help="Scenarios JSON file")
    p_eval.add_argument("--report-file", default=None, help="Output report JSON file")
    p_eval.set_defaults(func=cmd_evaluate)

    # triage
    p_triage = subparsers.add_parser("triage", help="Run triage prediction on symptom query")
    p_triage.add_argument("--query", required=True, help="Clinical inquiry or symptom description")
    p_triage.add_argument("--symptoms", nargs="*", default=[], help="Optional list of symptoms")
    p_triage.set_defaults(func=cmd_triage)

    # vision
    p_vision = subparsers.add_parser("vision", help="Analyze injury/wound photo")
    p_vision.add_argument("--image", required=True, help="Path to image file")
    p_vision.set_defaults(func=cmd_vision)

    # embed
    p_embed = subparsers.add_parser("embed", help="Generate dense vector embedding")
    p_embed.add_argument("--text", required=True, help="Text to embed")
    p_embed.set_defaults(func=cmd_embed)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
