from typing import List, Dict, Optional, Tuple
import re

CRITICAL_EMERGENCY_RULES: Dict[str, str] = {
    "anaphylaxis": r"(throat is closing|can't breathe|cant breathe|swollen tongue|difficulty swallowing|bee sting.*breathe|swelling lips|anaphylaxis|stridor)",
    "cardiac": r"(chest pain|heart attack|crushing (chest|pain)|pressure in chest|pain in (the )?left arm|crushing.*chest|radiating to (jaw|arm|back)|cold sweat.*chest|electrical shock|electrocuted)",
    "stroke": r"(face drooping|slurred speech|arm weakness|cannot speak|facial droop|sudden weakness|loss of speech|FAST protocol)",
    "massive_hemorrhage": r"(spurting blood|uncontrolled bleeding|gushing blood|pools of blood|arterial (bleeding|laceration)|bleeding.*not stopping|severe bleeding|impaled)",
    "airway_obstruction": r"(choking|airway blocked|turning blue|gasping.*cannot cry|high pitched squeaking|clutching throat|cannot cough|cyanosis|drowning|pulseless)",
    "severe_head_trauma": r"(head.*(unconscious|loss of consciousness|vomiting|dizziness)|(unconscious|loss of consciousness).*(head|fall)|unequal pupils|clear fluid from (ear|nose))",
    "spinal_trauma": r"(cannot move legs|numbness below neck|traumatic fall.*numb|neck injury.*tingling|spinal)",
    "hypothermia_heatstroke": r"(heat stroke|heatstroke|confusion in heat|stopped sweating|collapsed.*heat|heat.*collapsed|core temp|severe shivering.*confused|hypothermia.*unresponsive)",
    "severe_burns": r"(third degree burn|charred skin|circumferential burn|burn.*face|white or leathery skin|full thickness burn)",
    "poisoning_overdose": r"(swallowed (poison|bleach|chemical)|ingested bleach|overdose.*unresponsive|pinpoint pupils|drank chemical|suspected fentanyl|carbon monoxide)",
    "unresponsiveness": r"(unresponsive|loss of consciousness|passed out and won't wake)",
    "seizure": r"(tonic clonic|grand mal|seizure|convulsions)"
}

CONTRAINDICATION_RULES: Dict[str, Tuple[str, str]] = {
    "unconscious_oral": (
        r"(give (water|drink|food|milk|pills)|pour water in mouth).*unconscious",
        "DO NOT administer oral liquids, food, or medication to an unconscious or semiconscious patient due to lethal aspiration risk."
    ),
    "impaled_object_removal": (
        r"(pull out|remove|yank).*impaled",
        "DO NOT remove impaled or embedded objects. Stabilize the object in place with bulky dressings to prevent catastrophic internal hemorrhage."
    ),
    "neck_tourniquet": (
        r"tourniquet.*(neck|throat|head)",
        "NEVER apply a tourniquet around the neck or head. Tourniquets are strictly for limb extremity hemorrhages."
    ),
    "induce_vomiting_corrosive": (
        r"(make.*vomit|induce vomiting).*(bleach|acid|chemical|drain cleaner)",
        "DO NOT induce vomiting after corrosive chemical or caustic ingestion; re-exposure will burn the esophagus and airway."
    )
}

class SafetyEngine:
    def __init__(self, strictness: str = "high"):
        self.strictness = strictness

    def evaluate_query(self, query: str) -> List[str]:
        """Detect any clinical emergency red flags in query."""
        triggered = []
        normalized = query.lower()
        for condition, pattern in CRITICAL_EMERGENCY_RULES.items():
            if re.search(pattern, normalized):
                triggered.append(condition)
        return triggered

    def check_contraindications(self, text: str) -> List[str]:
        """Detect dangerous interventions and provide clinical contraindication warnings."""
        warnings = []
        normalized = text.lower()
        for key, (pattern, warning_msg) in CONTRAINDICATION_RULES.items():
            if re.search(pattern, normalized):
                warnings.append(warning_msg)
        return warnings

    def requires_emergency_dispatch(self, flags: List[str]) -> bool:
        """Determines if 911 / EMS dispatch is mandatory."""
        return len(flags) > 0

    def generate_escalation_message(self, flags: List[str]) -> str:
        """Builds immediate emergency alert banner for patient/first responder."""
        flag_descriptions = {
            "anaphylaxis": "Acute Anaphylaxis / Airway Compromise",
            "cardiac": "Acute Coronary Syndrome / Suspected Myocardial Infarction",
            "stroke": "Acute Neurological Deficit / Suspected Stroke",
            "massive_hemorrhage": "Critical Arterial Hemorrhage",
            "airway_obstruction": "Complete Foreign Body Airway Obstruction",
            "severe_head_trauma": "Severe Traumatic Brain Injury",
            "spinal_trauma": "Suspected Spinal Cord Compromise",
            "hypothermia_heatstroke": "Severe Environmental Hyper/Hypothermia Emergency",
            "severe_burns": "Critical / Full-Thickness Burn Emergency",
            "poisoning_overdose": "Toxicological / Toxic Ingestion Emergency",
            "unresponsiveness": "Acute Loss of Consciousness / Unresponsiveness",
            "seizure": "Generalized Seizure / Convulsions",
        }
        detected = [flag_descriptions.get(f, f.replace("_", " ").title()) for f in flags]

        return (
            "🚨 CRITICAL EMERGENCY ALERT 🚨\n\n"
            f"Detected High-Risk Condition(s): {', '.join(detected)}\n\n"
            "Your symptoms indicate an immediate, life-threatening medical emergency. "
            "CALL 911 OR YOUR LOCAL EMERGENCY DISPATCH IMMEDIATELY.\n\n"
            "• Do not attempt to drive yourself to the hospital.\n"
            "• Unlock your front door so first responders can enter.\n"
            "• Sit or lie down in a safe position while help is on the way."
        )
