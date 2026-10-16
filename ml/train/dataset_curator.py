from typing import Dict, List, Tuple
import json
import os
import random

SYSTEM_PROMPT = (
    "You are an emergency medical triage assistant. You provide concise, "
    "step-by-step first aid guidance. You always emphasize safety and call for 911 "
    "if symptoms are severe."
)

CLINICAL_TRAINING_DATA: List[Dict[str, str]] = [
    {
        "category": "airway",
        "instruction": "What should I do if someone is choking and cannot breathe?",
        "response": "1. Call 911 or instruct someone to call immediately.\n2. Stand behind them and deliver 5 firm back blows between shoulder blades.\n3. Perform 5 quick abdominal thrusts (Heimlich maneuver).\n4. Repeat 5 blows and 5 thrusts until airway is clear."
    },
    {
        "category": "bleeding",
        "instruction": "How do I treat an open bleeding laceration on the forearm?",
        "response": "1. Apply firm, direct pressure with a clean cloth or gauze.\n2. Keep the arm elevated above heart level if possible.\n3. Do not remove soaked gauze; add more layers on top.\n4. If bleeding does not stop after 10 minutes or spurts, seek immediate emergency care."
    },
    {
        "category": "burns",
        "instruction": "How do I care for a thermal burn on the hand?",
        "response": "1. Cool immediately with cool, gently running tap water for 10-20 minutes.\n2. Do NOT apply ice, butter, or ointments.\n3. Cover loosely with a sterile non-stick bandage or clean cling wrap.\n4. Seek medical attention if blistered, larger than 3 inches, or on joints."
    },
    {
        "category": "fracture",
        "instruction": "Someone has a suspected closed fracture in the lower leg.",
        "response": "1. Keep the limb immobilized in the position found.\n2. Support the leg with padding or a rigid splint above and below the fracture.\n3. Apply an ice pack wrapped in a cloth for 15 minutes to reduce swelling.\n4. Call emergency services and do not attempt to realign the bone."
    },
    {
        "category": "cardiac",
        "instruction": "Patient has sudden crushing chest pain radiating to the left shoulder.",
        "response": "1. Call 911 immediately—suspected heart attack.\n2. Have the person sit in a comfortable position, leaning back.\n3. Loosen tight collar or clothing.\n4. If conscious and not allergic, ask if their doctor prescribed aspirin.\n5. Be prepared to start hands-only CPR if they lose consciousness."
    },
    {
        "category": "anaphylaxis",
        "instruction": "Person stung by a wasp has swelling lips, wheezing, and hives.",
        "response": "1. Call 911 immediately—anaphylactic reaction.\n2. If the person carries an epinephrine auto-injector (EpiPen), administer it into the mid-outer thigh immediately.\n3. Hold the injector firmly for 3 seconds.\n4. Have them lie flat with legs elevated unless breathing is easier seated."
    },
    {
        "category": "heatstroke",
        "instruction": "Construction worker in heat is confused, hot, red, and no longer sweating.",
        "response": "1. Call 911 immediately—life-threatening heatstroke.\n2. Move person to a cool, shaded area immediately.\n3. Rapidly cool by applying cold wet cloths, ice packs to armpits/groin, or fanning.\n4. Do NOT force them to drink if they are confused or vomiting."
    },
    {
        "category": "hypothermia",
        "instruction": "Hiker pulled from freezing water is shivering violently and slurring words.",
        "response": "1. Call 911 and move out of the wind and cold.\n2. Remove wet clothing gently and replace with dry blankets.\n3. Insulate head and chest with warm layers.\n4. Do not rub limbs briskly or apply direct hot water bottles to bare skin."
    },
    {
        "category": "poisoning",
        "instruction": "Toddler accidentally swallowed a small amount of liquid detergent.",
        "response": "1. Call Poison Control immediately (1-800-222-1222 in USA).\n2. Do NOT induce vomiting or administer raw milk unless instructed by specialists.\n3. Wipe out remaining detergent from child's mouth.\n4. Save the product container for medical personnel."
    },
    {
        "category": "seizure",
        "instruction": "Colleague collapsed on the floor and is having a generalized motor seizure.",
        "response": "1. Clear sharp furniture and obstacles away from them.\n2. Cushion their head with a folded jacket or towel.\n3. Do NOT restrain their movements or force anything into their mouth.\n4. Time the seizure. Call 911 if it lasts > 5 minutes or if injury occurs.\n5. Turn them onto their side into recovery position once convulsions stop."
    },
    {
        "category": "head_trauma",
        "instruction": "Bicyclist fell without helmet and was unconscious for 30 seconds.",
        "response": "1. Keep head and neck perfectly still—suspected cervical spine injury.\n2. Call 911 immediately.\n3. Monitor breathing and pulse.\n4. Do NOT shake the person or move them unless in immediate danger."
    },
    {
        "category": "eye_injury",
        "instruction": "Household bleach splashed directly into both eyes.",
        "response": "1. Immediately flush eyes with clean tap water or saline for at least 15-20 minutes.\n2. Hold eyelids open and roll eyes during irrigation.\n3. Remove contact lenses during flushing if easy to do.\n4. Call 911 or proceed directly to an emergency eye center."
    },
    {
        "category": "nosebleed",
        "instruction": "Child has a spontaneous heavy nosebleed.",
        "response": "1. Have the child sit upright and lean slightly forward.\n2. Firmly pinch the soft part of the nose just below the nasal bridge for 10 full minutes.\n3. Breathe through the mouth.\n4. Do NOT tilt head backward (prevents swallowing blood and vomiting)."
    },
    {
        "category": "asthma",
        "instruction": "Person is wheezing heavily, coughing, and struggling to complete sentences.",
        "response": "1. Assist them in sitting upright and calming their breathing.\n2. Help them locate and use their rescue inhaler (Albuterol)—typically 2 puffs.\n3. Wait 5 minutes; if no improvement, administer another dose.\n4. Call 911 if breathing fails to improve rapidly or lips turn pale/blue."
    },
    {
        "category": "diabetic",
        "instruction": "Diabetic person is shaky, sweating profusely, pale, and confused.",
        "response": "1. Suspect hypoglycemia (low blood glucose).\n2. If conscious and able to swallow, give 15-20g of fast-acting sugar (fruit juice, candy, glucose tabs).\n3. Recheck symptoms after 15 minutes.\n4. If unconscious or unable to swallow safely, call 911 immediately—never force oral liquids."
    }
]

def format_instruction_sample(sample: Dict[str, str]) -> str:
    return (
        f"<|system|>\n{SYSTEM_PROMPT}</s>\n"
        f"<|user|>\n{sample['instruction']}</s>\n"
        f"<|assistant|>\n{sample['response']}</s>"
    )

def create_synthetic_dataset(output_path: str = "data/triage_dataset.jsonl") -> int:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for entry in CLINICAL_TRAINING_DATA:
            formatted = {
                "instruction": entry["instruction"],
                "response": entry["response"],
                "category": entry["category"],
                "text": format_instruction_sample(entry)
            }
            f.write(json.dumps(formatted) + "\n")
    return len(CLINICAL_TRAINING_DATA)

def create_dataset_splits(
    output_dir: str = "data",
    train_ratio: float = 0.8
) -> Tuple[int, int]:
    """Generates train and validation dataset splits."""
    os.makedirs(output_dir, exist_ok=True)
    shuffled = list(CLINICAL_TRAINING_DATA)
    random.seed(42)
    random.shuffle(shuffled)

    split_idx = int(len(shuffled) * train_ratio)
    train_data = shuffled[:split_idx]
    val_data = shuffled[split_idx:]

    train_path = os.path.join(output_dir, "train.jsonl")
    val_path = os.path.join(output_dir, "val.jsonl")

    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item) + "\n")

    with open(val_path, "w", encoding="utf-8") as f:
        for item in val_data:
            f.write(json.dumps(item) + "\n")

    return len(train_data), len(val_data)
