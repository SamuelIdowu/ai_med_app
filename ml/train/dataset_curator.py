"""Dataset Curator for Medical Triage & First-Aid Systems.

Provides both:
1. Classical Tabular Clinical Datasets (Pandas CSV for Scikit-Learn classification & EDA)
2. Comprehensive Instruction-Tuning Protocols (JSONL for LoRA / RAG)

Covers 35 distinct First Aid conditions across 8 major emergency domains:
- Resuscitation & Airway
- Severe Trauma & Hemorrhage
- Thermal & Environmental
- Medical Emergencies
- Toxins & Bites
- Pediatric & Special Scenarios
- Soft Tissue, Musculoskeletal & Minor
- Heat Exhaustion & Dehydration
"""

import json
import os
import random
from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd

SYSTEM_PROMPT = (
    "You are an emergency medical triage assistant. You provide concise, "
    "step-by-step first aid guidance. You always emphasize safety and call for 911 "
    "if symptoms are severe."
)

# ---------------------------------------------------------------------------
# Comprehensive 35-Condition First Aid Taxonomy & Clinical Distributions
# ---------------------------------------------------------------------------

CONDITION_TAXONOMY: List[Dict[str, Any]] = [
    # 1. Resuscitation & Airway
    {
        "id": "cardiac_arrest",
        "name": "Cardiac Arrest",
        "category": "resuscitation",
        "base_triage": 2,  # Emergency
        "hr_range": (0, 30),
        "bp_sys_range": (0, 50),
        "bp_dia_range": (0, 30),
        "rr_range": (0, 4),
        "spo2_range": (40, 70),
        "temp_range": (35.0, 36.5),
        "pain_range": (0, 0),
        "bleeding_prob": 0.05,
        "altered_mental_prob": 1.0,
        "instruction": "Patient is unresponsive, collapsed, and not breathing normally.",
        "response": "1. Call 911 immediately and request an AED.\n2. Place hands centered on chest and deliver hard, fast chest compressions (100-120 bpm, 2 inches deep).\n3. Turn on AED as soon as available and follow audio prompts.\n4. Do not pause compressions except for AED analysis or shock delivery."
    },
    {
        "id": "choking_adult",
        "name": "Severe Choking (Adult)",
        "category": "airway",
        "base_triage": 2,
        "hr_range": (110, 160),
        "bp_sys_range": (130, 180),
        "bp_dia_range": (85, 110),
        "rr_range": (28, 42),
        "spo2_range": (70, 88),
        "temp_range": (36.4, 37.2),
        "pain_range": (6, 9),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.6,
        "instruction": "Adult is clutching throat, silent, turning blue, unable to speak or cough.",
        "response": "1. Verify severe airway obstruction (cannot cough or speak).\n2. Stand behind the person, wrap arms around waist.\n3. Make a fist just above the navel, grasp with other hand, deliver 5 inward and upward thrusts (Heimlich).\n4. Alternate 5 back blows and 5 abdominal thrusts until object is expelled.\n5. If patient collapses unconscious, call 911 and begin CPR."
    },
    {
        "id": "severe_asthma",
        "name": "Acute Severe Asthma",
        "category": "airway",
        "base_triage": 2,
        "hr_range": (115, 150),
        "bp_sys_range": (130, 165),
        "bp_dia_range": (80, 100),
        "rr_range": (30, 44),
        "spo2_range": (78, 90),
        "temp_range": (36.5, 37.4),
        "pain_range": (4, 8),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.4,
        "instruction": "Patient is wheezing loudly, gasping for air, unable to finish sentences.",
        "response": "1. Call 911 immediately if patient struggles to breathe or lips appear bluish.\n2. Sit patient upright and keep calm.\n3. Administer 2 to 4 puffs of rescue inhaler (Albuterol) via spacer if available.\n4. Repeat inhaler every 4-5 minutes while waiting for emergency services."
    },
    {
        "id": "anaphylaxis",
        "name": "Anaphylactic Shock",
        "category": "resuscitation",
        "base_triage": 2,
        "hr_range": (120, 160),
        "bp_sys_range": (65, 95),
        "bp_dia_range": (40, 60),
        "rr_range": (26, 40),
        "spo2_range": (80, 92),
        "temp_range": (36.5, 37.3),
        "pain_range": (3, 7),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.7,
        "instruction": "Person stung by bee has swelling lips, throat constriction, hives, and dizziness.",
        "response": "1. Inject Epinephrine auto-injector (EpiPen) into mid-outer thigh immediately.\n2. Hold firmly in place for 3 seconds, then massage area.\n3. Call 911 immediately.\n4. Keep patient lying flat with legs raised, unless breathing difficulty requires sitting upright."
    },
    {
        "id": "drowning",
        "name": "Near-Drowning / Submersion",
        "category": "resuscitation",
        "base_triage": 2,
        "hr_range": (50, 130),
        "bp_sys_range": (70, 110),
        "bp_dia_range": (40, 70),
        "rr_range": (6, 36),
        "spo2_range": (65, 86),
        "temp_range": (33.0, 35.8),
        "pain_range": (0, 4),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.9,
        "instruction": "Victim pulled from pool water, unresponsive or coughing fluid weakly.",
        "response": "1. Call 911 immediately.\n2. Check for breathing: if absent, immediately provide 2 initial rescue breaths before chest compressions.\n3. Continue standard CPR cycles (30 compressions : 2 rescue breaths).\n4. Keep victim warm with dry blankets to combat hypothermia."
    },

    # 2. Severe Trauma & Hemorrhage
    {
        "id": "arterial_bleeding",
        "name": "Arterial Hemorrhage",
        "category": "trauma",
        "base_triage": 2,
        "hr_range": (125, 165),
        "bp_sys_range": (70, 95),
        "bp_dia_range": (40, 60),
        "rr_range": (24, 38),
        "spo2_range": (88, 97),
        "temp_range": (35.8, 36.8),
        "pain_range": (7, 10),
        "bleeding_prob": 1.0,
        "altered_mental_prob": 0.6,
        "instruction": "Bright red blood spurting vigorously from a deep wound on upper thigh.",
        "response": "1. Call 911 immediately—life-threatening arterial bleed.\n2. Apply a commercial windlass tourniquet 2-3 inches above wound (not over joint).\n3. Tighten windlass rod until bright spurting stops completely, secure rod in clip.\n4. Note exact time of tourniquet application on forehead or band.\n5. If tourniquet unavailable, pack wound tightly with hemostatic gauze and hold direct pressure with two hands."
    },
    {
        "id": "impaled_object",
        "name": "Impaled Foreign Object",
        "category": "trauma",
        "base_triage": 2,
        "hr_range": (100, 135),
        "bp_sys_range": (110, 150),
        "bp_dia_range": (70, 95),
        "rr_range": (20, 30),
        "spo2_range": (94, 99),
        "temp_range": (36.5, 37.2),
        "pain_range": (7, 10),
        "bleeding_prob": 0.7,
        "altered_mental_prob": 0.2,
        "instruction": "Piece of metal rebar punctured deeply into lower abdominal wall.",
        "response": "1. DO NOT remove the impaled object—it is tamponading internal blood vessels.\n2. Call 911 immediately.\n3. Stabilize the object with bulky dressings/rolled bandages on both sides.\n4. Secure dressings with tape or wide wrap without pressing directly on the object."
    },
    {
        "id": "head_trauma_concussion",
        "name": "Severe Head Trauma / Traumatic Brain Injury",
        "category": "trauma",
        "base_triage": 2,
        "hr_range": (50, 110),
        "bp_sys_range": (140, 190),
        "bp_dia_range": (60, 100),
        "rr_range": (10, 26),
        "spo2_range": (90, 98),
        "temp_range": (36.4, 37.4),
        "pain_range": (6, 10),
        "bleeding_prob": 0.4,
        "altered_mental_prob": 0.9,
        "instruction": "Construction worker fell 10ft, loss of consciousness, unequal pupils, vomiting.",
        "response": "1. Call 911 immediately—suspected severe intracranial injury.\n2. Stabilize cervical spine: hold head manually in neutral alignment, do not bend neck.\n3. Monitor airway and breathing continuously.\n4. If vomiting occurs, log-roll entire body as a single unit onto side to prevent aspiration."
    },
    {
        "id": "sucking_chest_wound",
        "name": "Open Chest Wound (Tension Pneumothorax)",
        "category": "trauma",
        "base_triage": 2,
        "hr_range": (120, 155),
        "bp_sys_range": (80, 105),
        "bp_dia_range": (50, 70),
        "rr_range": (32, 46),
        "spo2_range": (78, 88),
        "temp_range": (36.2, 37.1),
        "pain_range": (8, 10),
        "bleeding_prob": 0.8,
        "altered_mental_prob": 0.5,
        "instruction": "Penetrating stab wound to chest with audible hissing/sucking sound on inhale.",
        "response": "1. Call 911 immediately.\n2. Wipe skin dry and apply a commercial vented chest seal over the puncture.\n3. If no vented seal, tape clean plastic wrap on THREE sides to create a one-way flutter valve.\n4. If patient worsens with severe respiratory distress, lift seal briefly to release trapped air."
    },
    {
        "id": "traumatic_amputation",
        "name": "Traumatic Amputation",
        "category": "trauma",
        "base_triage": 2,
        "hr_range": (115, 155),
        "bp_sys_range": (80, 110),
        "bp_dia_range": (50, 75),
        "rr_range": (22, 34),
        "spo2_range": (92, 98),
        "temp_range": (36.0, 37.0),
        "pain_range": (8, 10),
        "bleeding_prob": 0.9,
        "altered_mental_prob": 0.4,
        "instruction": "Severe power tool accident completely severed two fingers on left hand.",
        "response": "1. Call 911 immediately.\n2. Apply direct pressure to the stump using sterile gauze; apply a tourniquet if bleeding is uncontrolled.\n3. Wrap severed digits in sterile gauze moistened with saline.\n4. Place wrapped digits in a sealed plastic bag, then set that bag inside a container of ice water (do NOT place directly on ice)."
    },

    # 3. Thermal & Environmental Emergencies
    {
        "id": "third_degree_burn",
        "name": "Third-Degree (Full Thickness) Burn",
        "category": "environmental",
        "base_triage": 2,
        "hr_range": (115, 150),
        "bp_sys_range": (90, 130),
        "bp_dia_range": (55, 80),
        "rr_range": (22, 34),
        "spo2_range": (90, 97),
        "temp_range": (36.0, 37.8),
        "pain_range": (4, 9),
        "bleeding_prob": 0.1,
        "altered_mental_prob": 0.3,
        "instruction": "Leathery white and charred skin on chest and arms after industrial flame flash.",
        "response": "1. Call 911 immediately—extensive deep thermal injury.\n2. Remove victim from heat source and ensure personal safety.\n3. Cover burned area loosely with dry, sterile non-stick sheets or dressings.\n4. Do NOT apply cold water or ice to large burns (causes hypothermia).\n5. Keep patient warm with clean blankets."
    },
    {
        "id": "second_degree_burn",
        "name": "Second-Degree (Partial Thickness) Burn",
        "category": "environmental",
        "base_triage": 1,  # Urgent
        "hr_range": (85, 115),
        "bp_sys_range": (115, 140),
        "bp_dia_range": (70, 90),
        "rr_range": (16, 24),
        "spo2_range": (96, 100),
        "temp_range": (36.6, 37.6),
        "pain_range": (6, 9),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.05,
        "instruction": "Boiling water spilled on forearm, causing large blistered red patches.",
        "response": "1. Cool burn immediately with cool, running tap water for 10-20 minutes.\n2. Do NOT pop intact blisters.\n3. Cover loosely with sterile non-adherent dressing or cling wrap.\n4. Seek urgent medical care if burn covers more than 3 inches or affects joints."
    },
    {
        "id": "heatstroke",
        "name": "Heatstroke (Hyperthermia)",
        "category": "environmental",
        "base_triage": 2,
        "hr_range": (125, 170),
        "bp_sys_range": (85, 130),
        "bp_dia_range": (50, 80),
        "rr_range": (28, 42),
        "spo2_range": (90, 96),
        "temp_range": (40.0, 42.0),
        "pain_range": (3, 7),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.95,
        "instruction": "Marathon runner collapsed in 95°F sun, hot dry red skin, delirium, vomiting.",
        "response": "1. Call 911 immediately—medical emergency.\n2. Move patient to shaded or air-conditioned area.\n3. Cool aggressively: immerse in cold water bath if possible, or pack ice to neck, armpits, and groin.\n4. Fan vigorously while wetting skin with cool water.\n5. Do NOT give oral fluids if patient has altered consciousness."
    },
    {
        "id": "severe_hypothermia",
        "name": "Severe Hypothermia",
        "category": "environmental",
        "base_triage": 2,
        "hr_range": (40, 65),
        "bp_sys_range": (70, 95),
        "bp_dia_range": (40, 60),
        "rr_range": (6, 12),
        "spo2_range": (82, 92),
        "temp_range": (28.0, 32.5),
        "pain_range": (1, 4),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.9,
        "instruction": "Lost hiker in blizzard found rigid, barely shivering, mumbling incoherently.",
        "response": "1. Call 911 immediately.\n2. Handle victim very gently—rough movements can trigger fatal cardiac arrhythmias.\n3. Move to sheltered environment, gently cut off wet clothes, wrap in sleeping bags/thermal foil.\n4. Apply warm packs to trunk (chest, neck, groin), never limbs first."
    },
    {
        "id": "electrical_shock",
        "name": "High-Voltage Electrical Shock",
        "category": "environmental",
        "base_triage": 2,
        "hr_range": (40, 160),
        "bp_sys_range": (80, 150),
        "bp_dia_range": (50, 95),
        "rr_range": (8, 30),
        "spo2_range": (85, 96),
        "temp_range": (36.2, 37.3),
        "pain_range": (5, 9),
        "bleeding_prob": 0.05,
        "altered_mental_prob": 0.7,
        "instruction": "Worker contacted live wire, thrown backwards, entry and exit burns on hands/feet.",
        "response": "1. Ensure power is turned off before touching the victim.\n2. Call 911 immediately.\n3. Check pulse and breathing; start CPR and attach AED if pulseless.\n4. Keep patient still and cover burn entry/exit wounds with dry sterile dressings."
    },
    {
        "id": "frostbite",
        "name": "Deep Frostbite",
        "category": "environmental",
        "base_triage": 1,
        "hr_range": (65, 95),
        "bp_sys_range": (110, 140),
        "bp_dia_range": (70, 90),
        "rr_range": (14, 20),
        "spo2_range": (94, 99),
        "temp_range": (35.0, 36.8),
        "pain_range": (4, 8),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.1,
        "instruction": "Toes appear waxy white, rock-hard to touch, completely numb after hours in snow.",
        "response": "1. Move patient to a warm area.\n2. Do NOT rub the frostbitten tissue or expose to direct fire/stoves.\n3. Do NOT rewarm if there is any chance of refreezing before reaching hospital.\n4. Rewarm in warm water bath (99-102°F / 37-39°C) for 20-30 minutes if definitive care is distant."
    },

    # 4. Medical Emergencies
    {
        "id": "myocardial_infarction",
        "name": "Acute Myocardial Infarction (Heart Attack)",
        "category": "medical",
        "base_triage": 2,
        "hr_range": (95, 140),
        "bp_sys_range": (130, 190),
        "bp_dia_range": (85, 115),
        "rr_range": (20, 32),
        "spo2_range": (90, 96),
        "temp_range": (36.5, 37.3),
        "pain_range": (8, 10),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.3,
        "instruction": "58-year-old clutches chest: intense crushing pressure radiating to jaw and left arm.",
        "response": "1. Call 911 immediately.\n2. Have patient rest in a comfortable position (semi-seated with knees bent).\n3. If not allergic or contraindicated, administer 1 adult aspirin (325 mg) or 4 chewable baby aspirins (81 mg) to chew.\n4. Be ready to initiate CPR and use an AED if patient collapses."
    },
    {
        "id": "acute_stroke",
        "name": "Acute Ischemic Stroke (FAST Protocol)",
        "category": "medical",
        "base_triage": 2,
        "hr_range": (80, 120),
        "bp_sys_range": (160, 220),
        "bp_dia_range": (95, 130),
        "rr_range": (16, 26),
        "spo2_range": (92, 98),
        "temp_range": (36.5, 37.5),
        "pain_range": (2, 7),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.8,
        "instruction": "Sudden facial droop, arm weakness on right side, slurred and garbled speech.",
        "response": "1. Call 911 immediately—state 'Suspected Stroke'.\n2. Note exact time symptoms were last known normal (critical for thrombolysis window).\n3. Keep patient lying down with head elevated 15-30 degrees.\n4. Do NOT give food, drink, or aspirin (stroke may be hemorrhagic)."
    },
    {
        "id": "tonic_clonic_seizure",
        "name": "Generalized Tonic-Clonic Seizure",
        "category": "medical",
        "base_triage": 2,
        "hr_range": (120, 160),
        "bp_sys_range": (135, 180),
        "bp_dia_range": (85, 110),
        "rr_range": (18, 32),
        "spo2_range": (82, 93),
        "temp_range": (36.8, 38.2),
        "pain_range": (0, 0),
        "bleeding_prob": 0.1,  # bitten tongue
        "altered_mental_prob": 1.0,
        "instruction": "Person collapsed, violent full-body muscle contractions, foaming at mouth.",
        "response": "1. Protect from injury: clear hard or sharp objects away.\n2. Cushion head with soft folded clothing.\n3. Do NOT restrain patient or force anything into mouth.\n4. Time the seizure. Call 911 if seizure lasts > 5 minutes, repeats, or patient is pregnant/injured.\n5. Turn onto side in recovery position once jerking stops."
    },
    {
        "id": "diabetic_hypoglycemia",
        "name": "Severe Diabetic Hypoglycemia",
        "category": "medical",
        "base_triage": 2,
        "hr_range": (105, 140),
        "bp_sys_range": (110, 150),
        "bp_dia_range": (70, 95),
        "rr_range": (18, 28),
        "spo2_range": (95, 100),
        "temp_range": (36.0, 36.9),
        "pain_range": (1, 4),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.9,
        "instruction": "Type 1 diabetic is profuse cold sweating, trembling, confused, and slurring words.",
        "response": "1. Rule of 15: If conscious and able to swallow, give 15-20 grams of fast-acting carbohydrate (fruit juice, soda, glucose tablets).\n2. Wait 15 minutes and reassess.\n3. If unconscious or unable to swallow, do NOT force oral liquids; administer Glucagon or call 911 immediately."
    },
    {
        "id": "diabetic_hyperglycemia_dka",
        "name": "Diabetic Ketoacidosis (DKA)",
        "category": "medical",
        "base_triage": 1,
        "hr_range": (110, 145),
        "bp_sys_range": (90, 125),
        "bp_dia_range": (60, 80),
        "rr_range": (26, 38),  # Kussmaul respirations
        "spo2_range": (95, 99),
        "temp_range": (36.7, 38.0),
        "pain_range": (4, 7),  # abdominal pain
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.5,
        "instruction": "Diabetic patient has deep rapid breathing, fruity acetone breath, abdominal pain, extreme thirst.",
        "response": "1. Call 911 or proceed to nearest emergency department immediately.\n2. Check blood glucose if meter is on hand (typically > 250-300 mg/dL).\n3. Keep patient seated comfortably and hydrated with small sips of water if conscious.\n4. Monitor breathing and mental status closely."
    },
    {
        "id": "septic_shock",
        "name": "Severe Sepsis / Septic Shock",
        "category": "medical",
        "base_triage": 2,
        "hr_range": (115, 160),
        "bp_sys_range": (65, 88),
        "bp_dia_range": (35, 55),
        "rr_range": (28, 42),
        "spo2_range": (86, 94),
        "temp_range": (38.8, 40.5),
        "pain_range": (5, 9),
        "bleeding_prob": 0.05,
        "altered_mental_prob": 0.8,
        "instruction": "Elderly patient with UTI now has high fever, severe shivering, confusion, and mottled cold clammy skin.",
        "response": "1. Call 911 immediately—suspected septic shock is a medical emergency.\n2. Keep patient lying down with legs elevated to support low blood pressure.\n3. Keep warm with blankets.\n4. Inform dispatch of suspected sepsis to expedite hospital antibiotic protocols."
    },

    # 5. Toxins & Envenomation
    {
        "id": "snake_envenomation",
        "name": "Pit Viper / Snake Envenomation",
        "category": "toxins",
        "base_triage": 2,
        "hr_range": (105, 145),
        "bp_sys_range": (85, 125),
        "bp_dia_range": (50, 80),
        "rr_range": (20, 30),
        "spo2_range": (93, 98),
        "temp_range": (36.5, 37.4),
        "pain_range": (7, 10),
        "bleeding_prob": 0.3,
        "altered_mental_prob": 0.3,
        "instruction": "Rattlesnake bite to lower ankle: immediate swelling, severe pain, fang marks oozing.",
        "response": "1. Call 911 immediately for antivenom transport.\n2. Keep victim calm and still to slow venom circulation; immobilize bitten limb below heart level.\n3. Remove constricting jewelry, watches, or shoes before swelling worsens.\n4. Do NOT cut the wound, suck venom, apply ice, or use a tourniquet."
    },
    {
        "id": "insect_spider_bite",
        "name": "Black Widow / Brown Recluse Bite",
        "category": "toxins",
        "base_triage": 1,
        "hr_range": (90, 125),
        "bp_sys_range": (125, 160),
        "bp_dia_range": (80, 105),
        "rr_range": (16, 24),
        "spo2_range": (95, 99),
        "temp_range": (36.6, 37.8),
        "pain_range": (6, 9),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.1,
        "instruction": "Bitten by black spider with red hourglass: severe muscle cramps, rigid abdomen.",
        "response": "1. Wash bite area with soap and water.\n2. Apply a cold compress or ice pack wrapped in a cloth for 15 minutes.\n3. Seek urgent medical evaluation at urgent care or emergency room.\n4. If possible, photograph the spider safely for identification."
    },
    {
        "id": "chemical_ingestion",
        "name": "Corrosive Chemical Ingestion",
        "category": "toxins",
        "base_triage": 2,
        "hr_range": (110, 150),
        "bp_sys_range": (100, 140),
        "bp_dia_range": (65, 90),
        "rr_range": (22, 34),
        "spo2_range": (90, 97),
        "temp_range": (36.5, 37.5),
        "pain_range": (8, 10),
        "bleeding_prob": 0.2,
        "altered_mental_prob": 0.4,
        "instruction": "Adult accidentally swallowed concentrated lye / oven cleaner, throat burning intensely.",
        "response": "1. Call 911 and Poison Control (1-800-222-1222) immediately.\n2. Do NOT induce vomiting (corrosive re-burns esophagus on way up).\n3. Do NOT give neutralizing acids, activated charcoal, or raw milk.\n4. Rinse mouth with small amounts of water if patient is alert and cooperative."
    },
    {
        "id": "carbon_monoxide",
        "name": "Carbon Monoxide Poisoning",
        "category": "toxins",
        "base_triage": 2,
        "hr_range": (105, 145),
        "bp_sys_range": (100, 145),
        "bp_dia_range": (65, 90),
        "rr_range": (20, 32),
        "spo2_range": (88, 97),
        "temp_range": (36.4, 37.2),
        "pain_range": (5, 8),  # severe headache
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.7,
        "instruction": "Family using generator indoors has throbbing headache, dizziness, nausea, cherry-red lips.",
        "response": "1. Evacuate all occupants to fresh outdoor air immediately.\n2. Call 911 and report suspected carbon monoxide poisoning.\n3. Keep patients warm and resting quietly.\n4. Administer high-flow 100% oxygen as soon as EMS arrives."
    },

    # 6. Pediatric & Special Scenarios
    {
        "id": "infant_choking",
        "name": "Infant Choking (< 1 Year)",
        "category": "pediatric",
        "base_triage": 2,
        "hr_range": (140, 190),
        "bp_sys_range": (70, 95),
        "bp_dia_range": (40, 60),
        "rr_range": (35, 60),
        "spo2_range": (75, 89),
        "temp_range": (36.5, 37.4),
        "pain_range": (6, 9),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.5,
        "instruction": "7-month-old infant suddenly silent, unable to cry or cough, skin turning blue.",
        "response": "1. Place infant facedown along your forearm, supporting head and jaw with fingers.\n2. Deliver 5 firm back slaps between shoulder blades with heel of hand.\n3. Turn infant face-up, deliver 5 quick chest thrusts (using 2 fingers in center of chest).\n4. Repeat 5 back slaps and 5 chest thrusts until obstruction clears or infant goes unconscious."
    },
    {
        "id": "febrile_seizure",
        "name": "Pediatric Febrile Convulsion",
        "category": "pediatric",
        "base_triage": 1,
        "hr_range": (130, 175),
        "bp_sys_range": (85, 110),
        "bp_dia_range": (50, 70),
        "rr_range": (24, 38),
        "spo2_range": (94, 99),
        "temp_range": (39.2, 41.0),
        "pain_range": (2, 5),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.8,
        "instruction": "2-year-old with sudden 104°F spike having rhythmic arm and leg jerking for 2 minutes.",
        "response": "1. Place child on a safe soft surface on their side to maintain open airway.\n2. Do NOT restrain child or put anything in mouth.\n3. Loosen tight clothing to aid cooling.\n4. Seek urgent medical evaluation at emergency clinic to determine source of infection."
    },

    # 7. Soft Tissue, Musculoskeletal & Minor
    {
        "id": "closed_fracture",
        "name": "Closed Long-Bone Fracture",
        "category": "musculoskeletal",
        "base_triage": 1,
        "hr_range": (85, 115),
        "bp_sys_range": (120, 150),
        "bp_dia_range": (75, 95),
        "rr_range": (16, 22),
        "spo2_range": (96, 100),
        "temp_range": (36.5, 37.2),
        "pain_range": (7, 10),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.05,
        "instruction": "Skater heard loud crack in tibia, bone deformed under skin, cannot bear weight.",
        "response": "1. Splint the limb in the position found; immobilize joint above and below fracture.\n2. Check circulation (pulse, capillary refill, toe warmth) before and after splinting.\n3. Apply an ice pack wrapped in cloth to reduce swelling.\n4. Transport to emergency department; do not attempt to straighten the bone."
    },
    {
        "id": "joint_dislocation",
        "name": "Shoulder / Joint Dislocation",
        "category": "musculoskeletal",
        "base_triage": 1,
        "hr_range": (80, 110),
        "bp_sys_range": (115, 145),
        "bp_dia_range": (70, 90),
        "rr_range": (14, 20),
        "spo2_range": (97, 100),
        "temp_range": (36.5, 37.1),
        "pain_range": (7, 9),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.0,
        "instruction": "Football player has square shoulder deformity, intense pain, unable to move arm.",
        "response": "1. Support the injured shoulder in the position of most comfort using a sling.\n2. Do NOT attempt to pop joint back into socket.\n3. Apply ice pack wrapped in towel to manage swelling.\n4. Proceed to urgent care or emergency room for radiograph and reduction."
    },
    {
        "id": "sprain_strain",
        "name": "Ankle Ligament Sprain (Grade II)",
        "category": "minor",
        "base_triage": 0,  # Non-Urgent
        "hr_range": (65, 88),
        "bp_sys_range": (110, 130),
        "bp_dia_range": (68, 84),
        "rr_range": (12, 18),
        "spo2_range": (97, 100),
        "temp_range": (36.5, 37.0),
        "pain_range": (3, 6),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.0,
        "instruction": "Twisted ankle stepping off curb; swollen lateral ankle, can limp with pain.",
        "response": "1. Apply R.I.C.E protocol: Rest the ankle and avoid bearing weight.\n2. Ice for 15-20 minutes every 2-3 hours wrapped in cloth.\n3. Compress with an elastic bandage from toes toward calf.\n4. Elevate ankle above heart level while resting."
    },
    {
        "id": "epistaxis_nosebleed",
        "name": "Spontaneous Anterior Nosebleed",
        "category": "minor",
        "base_triage": 0,
        "hr_range": (70, 95),
        "bp_sys_range": (115, 135),
        "bp_dia_range": (72, 88),
        "rr_range": (12, 18),
        "spo2_range": (97, 100),
        "temp_range": (36.5, 37.0),
        "pain_range": (1, 4),
        "bleeding_prob": 0.05,  # minor, not severe arterial
        "altered_mental_prob": 0.0,
        "instruction": "Dry weather caused sudden steady nosebleed from one nostril.",
        "response": "1. Sit upright and lean slightly forward (do NOT tilt head back).\n2. Firmly pinch the soft part of the nose just below the nasal bone for 10-15 continuous minutes.\n3. Breathe gently through the mouth.\n4. If bleeding continues past 20 minutes of continuous direct pressure, seek urgent medical care."
    },
    {
        "id": "chemical_eye_burn",
        "name": "Chemical Eye Splash",
        "category": "trauma",
        "base_triage": 2,
        "hr_range": (90, 125),
        "bp_sys_range": (120, 150),
        "bp_dia_range": (75, 95),
        "rr_range": (16, 24),
        "spo2_range": (97, 100),
        "temp_range": (36.5, 37.1),
        "pain_range": (8, 10),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.1,
        "instruction": "Chlorine or ammonia cleaning solution splashed directly into open eye.",
        "response": "1. Immediately flush the affected eye with clean running tap water or sterile saline for 15-20 continuous minutes.\n2. Hold eyelids open wide while rotating the eyeball.\n3. Remove contact lenses during flushing if easy to do.\n4. Seek emergency medical attention immediately after or during flushing."
    },
    {
        "id": "minor_abrasion_cut",
        "name": "Superficial Cut / Minor Abrasion",
        "category": "minor",
        "base_triage": 0,
        "hr_range": (60, 85),
        "bp_sys_range": (105, 125),
        "bp_dia_range": (65, 82),
        "rr_range": (12, 16),
        "spo2_range": (98, 100),
        "temp_range": (36.4, 37.0),
        "pain_range": (1, 3),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.0,
        "instruction": "Paper cut or shallow kitchen knife knick on thumb, slight bleeding stopped with tissue.",
        "response": "1. Wash wound thoroughly with mild soap and clean warm water.\n2. Apply gentle direct pressure with clean tissue until bleeding ceases.\n3. Apply thin layer of petroleum jelly or antibiotic ointment.\n4. Cover with a clean adhesive bandage."
    },

    # 8. Heat Exhaustion & Dehydration
    {
        "id": "heat_exhaustion",
        "name": "Heat Exhaustion",
        "category": "environmental",
        "base_triage": 1,
        "hr_range": (100, 130),
        "bp_sys_range": (95, 115),
        "bp_dia_range": (60, 75),
        "rr_range": (18, 26),
        "spo2_range": (95, 99),
        "temp_range": (37.8, 39.5),
        "pain_range": (3, 6),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.1,
        "instruction": "Gardener working in sun is pale, heavily sweating, dizzy, nauseous, but alert.",
        "response": "1. Move to a cool, air-conditioned or shaded area immediately.\n2. Loosen or remove excess clothing.\n3. Sip cool water or an electrolyte sports drink slowly.\n4. Apply cool wet cloths to face and neck. If vomiting or confusion starts, call 911."
    },
    {
        "id": "acute_dehydration",
        "name": "Moderate-to-Severe Dehydration",
        "category": "medical",
        "base_triage": 1,
        "hr_range": (100, 135),
        "bp_sys_range": (90, 110),
        "bp_dia_range": (55, 70),
        "rr_range": (18, 24),
        "spo2_range": (95, 99),
        "temp_range": (37.0, 38.2),
        "pain_range": (2, 5),
        "bleeding_prob": 0.0,
        "altered_mental_prob": 0.25,
        "instruction": "Patient has had 24 hours of stomach flu vomiting, dry mouth, dark urine, sunken eyes.",
        "response": "1. Provide oral rehydration solution (ORS) or electrolyte mix in small frequent sips.\n2. Avoid plain water in large gulps, sodas, or caffeinated drinks.\n3. Rest quietly in a cool environment.\n4. Seek urgent medical evaluation if unable to keep fluids down for over 12 hours."
    }
]


# ---------------------------------------------------------------------------
# Classical Tabular Dataset Generator (Pandas / Scikit-Learn Format)
# ---------------------------------------------------------------------------

def sample_vital(val_range: Tuple[float, float], noise_std: float = 0.05) -> float:
    low, high = val_range
    mid = (low + high) / 2.0
    span = (high - low) / 2.0
    val = random.gauss(mid, max(span * 0.4, 0.1))
    return float(np.clip(val, low, high))


def generate_clinical_tabular_dataset(
    output_csv_path: str = "data/clinical_triage_features.csv",
    num_samples: int = 3500,
    random_seed: int = 42
) -> pd.DataFrame:
    """Generates a realistic clinical tabular dataset with physiological vitals & triage targets.
    
    Columns:
    - heart_rate (bpm)
    - systolic_bp (mmHg)
    - diastolic_bp (mmHg)
    - respiratory_rate (breaths/min)
    - oxygen_saturation (SpO2 %)
    - body_temperature (Celsius)
    - pain_score (0 - 10)
    - severe_bleeding (0 or 1)
    - altered_mental_status (0 or 1)
    - age (years)
    - condition (name of condition)
    - triage_level (0 = Non-Urgent, 1 = Urgent, 2 = Emergency)
    """
    random.seed(random_seed)
    np.random.seed(random_seed)

    rows = []
    num_conditions = len(CONDITION_TAXONOMY)
    samples_per_cond = num_samples // num_conditions

    for cond in CONDITION_TAXONOMY:
        for _ in range(samples_per_cond):
            # Age distribution tailored to condition (e.g. pediatric vs adult)
            if cond["category"] == "pediatric":
                age = random.randint(1, 12)
            else:
                age = int(np.clip(random.gauss(48, 20), 14, 92))

            hr = round(sample_vital(cond["hr_range"]), 1)
            sys_bp = round(sample_vital(cond["bp_sys_range"]), 1)
            dia_bp = round(sample_vital(cond["bp_dia_range"]), 1)
            # Ensure systolic > diastolic
            if sys_bp <= dia_bp:
                sys_bp = dia_bp + random.uniform(15, 30)

            rr = round(sample_vital(cond["rr_range"]), 1)
            spo2 = round(sample_vital(cond["spo2_range"]), 1)
            temp = round(sample_vital(cond["temp_range"]), 2)
            pain = int(round(sample_vital(cond["pain_range"])))
            pain = max(0, min(10, pain))

            bleeding = 1 if random.random() < cond["bleeding_prob"] else 0
            altered_mental = 1 if random.random() < cond["altered_mental_prob"] else 0

            # Determine triage level based on base condition + physiological red flags
            triage_level = cond["base_triage"]

            # Clinical escalation rule: physiological deterioration escalates urgency
            if (
                spo2 < 85.0
                or sys_bp < 80.0
                or hr > 150.0
                or rr > 38.0
                or altered_mental == 1
                or bleeding == 1
            ):
                triage_level = max(triage_level, 2)
            elif (
                spo2 < 93.0
                or sys_bp < 95.0
                or hr > 115.0
                or rr > 26.0
                or temp > 39.5
                or pain >= 7
            ):
                triage_level = max(triage_level, 1)

            rows.append({
                "age": age,
                "heart_rate": hr,
                "systolic_bp": sys_bp,
                "diastolic_bp": dia_bp,
                "respiratory_rate": rr,
                "oxygen_saturation": spo2,
                "body_temperature": temp,
                "pain_score": pain,
                "severe_bleeding": bleeding,
                "altered_mental_status": altered_mental,
                "condition": cond["name"],
                "triage_level": triage_level
            })

    # Fill remainder to reach exact num_samples
    while len(rows) < num_samples:
        cond = random.choice(CONDITION_TAXONOMY)
        age = int(np.clip(random.gauss(45, 18), 12, 88))
        rows.append({
            "age": age,
            "heart_rate": round(sample_vital(cond["hr_range"]), 1),
            "systolic_bp": round(sample_vital(cond["bp_sys_range"]), 1),
            "diastolic_bp": round(sample_vital(cond["bp_dia_range"]), 1),
            "respiratory_rate": round(sample_vital(cond["rr_range"]), 1),
            "oxygen_saturation": round(sample_vital(cond["spo2_range"]), 1),
            "body_temperature": round(sample_vital(cond["temp_range"]), 2),
            "pain_score": int(round(sample_vital(cond["pain_range"]))),
            "severe_bleeding": 1 if random.random() < cond["bleeding_prob"] else 0,
            "altered_mental_status": 1 if random.random() < cond["altered_mental_prob"] else 0,
            "condition": cond["name"],
            "triage_level": cond["base_triage"]
        })

    df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df.to_csv(output_csv_path, index=False)
    return df


def generate_protocols_dataset(output_path: str = "data/triage_protocols.jsonl") -> int:
    """Generates instruction-tuning / RAG protocols for all 35 conditions."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for entry in CONDITION_TAXONOMY:
            formatted = {
                "id": entry["id"],
                "name": entry["name"],
                "category": entry["category"],
                "triage_level": entry["base_triage"],
                "instruction": entry["instruction"],
                "response": entry["response"],
                "text": (
                    f"<|system|>\n{SYSTEM_PROMPT}</s>\n"
                    f"<|user|>\n{entry['instruction']}</s>\n"
                    f"<|assistant|>\n{entry['response']}</s>"
                )
            }
            f.write(json.dumps(formatted) + "\n")
    return len(CONDITION_TAXONOMY)


# Backwards compatibility wrappers
CLINICAL_TRAINING_DATA = [
    {
        "category": c["category"],
        "instruction": c["instruction"],
        "response": c["response"]
    }
    for c in CONDITION_TAXONOMY
]

def format_instruction_sample(sample: Dict[str, str]) -> str:
    return (
        f"<|system|>\n{SYSTEM_PROMPT}</s>\n"
        f"<|user|>\n{sample['instruction']}</s>\n"
        f"<|assistant|>\n{sample['response']}</s>"
    )

def create_synthetic_dataset(output_path: str = "data/triage_dataset.jsonl") -> int:
    return generate_protocols_dataset(output_path)

def create_dataset_splits(
    output_dir: str = "data",
    train_ratio: float = 0.8
) -> Tuple[int, int]:
    os.makedirs(output_dir, exist_ok=True)
    shuffled = list(CONDITION_TAXONOMY)
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
