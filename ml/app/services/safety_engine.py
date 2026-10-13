from typing import List, Dict
import re

CRITICAL_EMERGENCY_RULES: Dict[str, str] = {
    "anaphylaxis": r"(throat is closing|can't breathe|cant breathe|swollen tongue|difficulty swallowing|bee sting.*breathe|swelling lips|anaphylaxis)",
    "cardiac": r"(chest pain|heart attack|crushing (chest|pain)|pressure in chest|pain in (the )?left arm|crushing.*chest)",
    "stroke": r"(face drooping|slurred speech|arm weakness|cannot speak|facial droop)",
    "massive_hemorrhage": r"(spurting blood|uncontrolled bleeding|gushing blood|pools of blood|arterial (bleeding|laceration))",
    "airway_obstruction": r"(choking|airway blocked|turning blue|gasping.*cannot cry|high pitched squeaking|clutching throat)"
}

class SafetyEngine:
    def evaluate_query(self, query: str) -> List[str]:
        triggered = []
        normalized = query.lower()
        for condition, pattern in CRITICAL_EMERGENCY_RULES.items():
            if re.search(pattern, normalized):
                triggered.append(condition)
        return triggered

    def requires_emergency_dispatch(self, flags: List[str]) -> bool:
        return len(flags) > 0

    def generate_escalation_message(self, flags: List[str]) -> str:
        return (
            "🚨 CRITICAL EMERGENCY ALERT 🚨\n\n"
            "Your described symptoms suggest an immediate life-threatening emergency. "
            "Please CALL 911 OR YOUR LOCAL EMERGENCY SERVICE RIGHT NOW.\n\n"
            "While emergency services are in route, do not attempt to walk or drive yourself."
        )
