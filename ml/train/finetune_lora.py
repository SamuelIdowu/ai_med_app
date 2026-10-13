import os
from typing import Any, Dict

class LoraConfigFallback:
    """Fallback LoRA configuration when PEFT is not installed."""
    def __init__(self, r: int = 16, lora_alpha: int = 32, target_modules: list = None, lora_dropout: float = 0.05, bias: str = "none", task_type: str = "CAUSAL_LM"):
        self.r = r
        self.lora_alpha = lora_alpha
        self.target_modules = target_modules or ["q_proj", "v_proj", "k_proj", "o_proj"]
        self.lora_dropout = lora_dropout
        self.bias = bias
        self.task_type = task_type

    def __getitem__(self, item):
        return getattr(self, item)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "r": self.r,
            "lora_alpha": self.lora_alpha,
            "target_modules": self.target_modules,
            "lora_dropout": self.lora_dropout,
            "bias": self.bias,
            "task_type": self.task_type
        }

def get_lora_config():
    try:
        from peft import LoraConfig
        return LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM"
        )
    except ImportError:
        return LoraConfigFallback(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM"
        )

def prepare_peft_training(base_model):
    try:
        from peft import get_peft_model
        config = get_lora_config()
        model = get_peft_model(base_model, config)
        if hasattr(model, "print_trainable_parameters"):
            model.print_trainable_parameters()
        return model
    except ImportError:
        return base_model
