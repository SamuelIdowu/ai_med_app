from typing import List, Dict, Any, AsyncGenerator
import asyncio
import re

CLINICAL_PROTOCOLS: Dict[str, Dict[str, Any]] = {
    "bleeding": {
        "pattern": r"(bleed|cut|laceration|blood|gash|scrape|wound)",
        "protocol_name": "External Hemorrhage Control",
        "steps": [
            "Apply direct, continuous pressure immediately using a clean cloth, sterile gauze, or gloved hand.",
            "Maintain pressure without lifting the cloth for at least 10 minutes to allow platelet plug formation.",
            "If blood soaks through, do NOT remove the existing cloth—layer additional clean gauze firmly on top.",
            "Elevate the injured limb above heart level if no fractures are suspected.",
            "Once bleeding ceases, cleanse surrounding skin gently and secure a snug sterile dressing."
        ],
        "red_flags": ["Bleeding that spurts in rhythm with heartbeat", "Bleeding that does not stop after 10 minutes of direct pressure"]
    },
    "burn": {
        "pattern": r"(burn|scald|hot water|steam|blister|fire)",
        "protocol_name": "Thermal Burn Management",
        "steps": [
            "Immediately cool the burn under gently running, cool tap water for 10 to 20 minutes.",
            "Do NOT apply ice, ice water, butter, oils, toothpaste, or adhesive bandages directly to raw tissue.",
            "Gently remove constricting jewelry, rings, or tight clothing near the area before swelling begins.",
            "Cover the cooled area loosely with clean, non-stick sterile gauze or clean plastic wrap.",
            "Do NOT puncture intact blisters—blister roofs protect against virulent skin infections."
        ],
        "red_flags": ["Burns larger than 3 inches in diameter", "Burns covering the face, hands, feet, groin, or major joints"]
    },
    "fracture": {
        "pattern": r"(fracture|broken bone|snap|sprain|twist|twisted ankle|swollen wrist)",
        "protocol_name": "Musculoskeletal Immobilization & R.I.C.E.",
        "steps": [
            "Rest: Immediately stop weight-bearing activity and immobilize the affected limb in position of comfort.",
            "Ice: Apply a cold pack or ice wrapped in a damp cloth for 15-20 minutes every 2 hours.",
            "Compress: Wrap lightly with an elastic bandage from distal to proximal, checking that toes/fingers remain pink and warm.",
            "Elevate: Prop the limb above heart level to reduce painful inflammatory edema.",
            "Splint above and below suspected fractures using rolled magazines, cardboard, or rigid splints if transport is delayed."
        ],
        "red_flags": ["Visible bone protruding through skin", "Numbness, tingling, or cold pale extremity below the injury site"]
    },
    "choking": {
        "pattern": r"(choke|cannot cough|food stuck)",
        "protocol_name": "Foreign Body Airway Obstruction",
        "steps": [
            "Determine if victim can speak or cough forcibly. If coughing, encourage continued coughing.",
            "If unable to make sound, stand behind the patient and provide 5 firm back blows between shoulder blades.",
            "Perform 5 quick inward and upward abdominal thrusts (Heimlich maneuver) just above the navel.",
            "Alternate cycles of 5 back blows and 5 abdominal thrusts until object is expelled or patient becomes unresponsive."
        ],
        "red_flags": ["Loss of consciousness", "Inability to breathe or speak"]
    },
    "general": {
        "pattern": r".*",
        "protocol_name": "General Supportive First Aid",
        "steps": [
            "Assess the scene: ensure personal and patient safety from environmental hazards before approaching.",
            "Place the patient in a position of comfort and encourage slow, rhythmic diaphragmatic breathing.",
            "Keep the patient comfortably warm using blankets or clothing to prevent shock.",
            "Monitor airway, breathing rate, and mental responsiveness continuously until recovery or clinical evaluation."
        ],
        "red_flags": ["Sudden confusion or altered mental status", "Deteriorating vital signs"]
    }
}

class TriageEngine:
    """Generates protocol-driven clinical triage first-aid steps and streaming chunks."""

    def select_protocol(self, query: str, symptoms: List[str] = None) -> Dict[str, Any]:
        combined_text = f"{query} {' '.join(symptoms or [])}".lower()
        for key in ["choking", "bleeding", "burn", "fracture"]:
            proto = CLINICAL_PROTOCOLS[key]
            if re.search(proto["pattern"], combined_text):
                return proto
        return CLINICAL_PROTOCOLS["general"]

    def generate_triage_guidance(self, query: str, symptoms: List[str] = None) -> Dict[str, Any]:
        proto = self.select_protocol(query, symptoms)
        return {
            "protocol_name": proto["protocol_name"],
            "steps": proto["steps"],
            "red_flags": proto["red_flags"],
            "disclaimer": "This is algorithmic emergency triage assistance, not a substitute for direct medical diagnosis."
        }

    async def stream_protocol_steps(
        self,
        query: str,
        symptoms: List[str] = None,
        delay_seconds: float = 0.02
    ) -> AsyncGenerator[str, None]:
        proto = self.select_protocol(query, symptoms)
        yield f"**Protocol:** {proto['protocol_name']}\n\n"
        for i, step in enumerate(proto["steps"], start=1):
            await asyncio.sleep(delay_seconds)
            yield f"{i}. {step}\n"
        if proto.get("red_flags"):
            await asyncio.sleep(delay_seconds)
            yield f"\n⚠️ **Watch for Red Flags:** {', '.join(proto['red_flags'])}\n"
