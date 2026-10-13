from typing import Dict, List
import json
import os

SYSTEM_PROMPT = (
    "You are an emergency medical triage assistant. You provide concise, "
    "step-by-step first aid guidance. You always emphasize safety and call for 911 "
    "if symptoms are severe."
)

def format_instruction_sample(sample: Dict[str, str]) -> str:
    return (
        f"<|system|>\n{SYSTEM_PROMPT}</s>\n"
        f"<|user|>\n{sample['instruction']}</s>\n"
        f"<|assistant|>\n{sample['response']}</s>"
    )

def create_synthetic_dataset(output_path: str = "data/triage_dataset.jsonl") -> int:
    dataset = [
        {
            "instruction": "What should I do if someone is choking and cannot breathe?",
            "response": "1. Call 911 or instruct someone to call immediately.\n2. Stand behind them and deliver 5 firm back blows between shoulder blades.\n3. Perform 5 quick abdominal thrusts (Heimlich maneuver).\n4. Repeat 5 blows and 5 thrusts until airway is clear."
        },
        {
            "instruction": "How do I treat an open bleeding laceration on the forearm?",
            "response": "1. Apply firm, direct pressure with a clean cloth or gauze.\n2. Keep the arm elevated above heart level if possible.\n3. Do not remove soaked gauze; add more layers on top.\n4. If bleeding does not stop after 10 minutes or spurts, seek immediate emergency care."
        },
        {
            "instruction": "How do I care for a thermal burn on the hand?",
            "response": "1. Cool immediately with cool, gently running tap water for 10-20 minutes.\n2. Do NOT apply ice, butter, or ointments.\n3. Cover loosely with a sterile non-stick bandage or clean cling wrap.\n4. Seek medical attention if blistered, larger than 3 inches, or on joints."
        },
        {
            "instruction": "Someone has a suspected closed fracture in the lower leg.",
            "response": "1. Keep the limb immobilized in the position found.\n2. Support the leg with padding or a rigid splint above and below the fracture.\n3. Apply an ice pack wrapped in a cloth for 15 minutes to reduce swelling.\n4. Call emergency services and do not attempt to realign the bone."
        }
    ]
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for entry in dataset:
            f.write(json.dumps(entry) + "\n")
    return len(dataset)
