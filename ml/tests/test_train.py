import pytest
from train.dataset_curator import format_instruction_sample, create_synthetic_dataset
from train.finetune_lora import get_lora_config

def test_formats_alpaca_instruction_sample():
    sample = {
        "instruction": "How do I treat a second-degree burn?",
        "response": "Cool the burn under cool running water for at least 10 minutes."
    }
    formatted = format_instruction_sample(sample)
    assert "<|user|>" in formatted
    assert "<|assistant|>" in formatted
    assert sample["instruction"] in formatted
    assert sample["response"] in formatted

def test_lora_config():
    config = get_lora_config()
    assert config.r == 16 or config["r"] == 16
    assert config.lora_alpha == 32 or config["lora_alpha"] == 32
    target_modules = config.target_modules if hasattr(config, "target_modules") else config["target_modules"]
    assert "q_proj" in target_modules

def test_creates_synthetic_dataset(tmp_path):
    dataset_file = tmp_path / "triage.jsonl"
    count = create_synthetic_dataset(str(dataset_file))
    assert count == 4
    assert dataset_file.exists()
