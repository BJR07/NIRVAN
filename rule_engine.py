# server/rule_engine.py
from typing import List, Dict, Any

# Keywords and priority definitions
EMERGENCY_KEYWORDS = {"help", "fire", "emergency", "stop", "hurt", "injury", "911", "ambulance"}
HIGH_PRIORITY_EVENTS = {"gunshot", "siren", "fire_alarm", "explosion"}

def infer_from_transcript_and_events(transcript: str, events: List[Dict[str, Any]]) -> str:
    """
    Simple rule-based fusion returning a one-line inference.
    """
    t = (transcript or "").lower()

    # event labels: get top label
    top_event = None
    if events:
        # assume events list has 'label' and 'conf'
        top_event = max(events, key=lambda x: x.get("conf", 0))
        evt_label = top_event.get("label", "").lower()
    else:
        evt_label = ""

    reasons = []
    confidence_score = 0.0

    # rule: event high priority
    if evt_label:
        for hp in HIGH_PRIORITY_EVENTS:
            if hp in evt_label:
                reasons.append(f"High-priority event detected: {evt_label} (confidence {top_event.get('conf'):.2f})")
                confidence_score = max(confidence_score, 0.9)

    # rule: keywords in transcript
    for kw in EMERGENCY_KEYWORDS:
        if kw in t:
            reasons.append(f"Keyword in speech: '{kw}' detected in transcript")
            confidence_score = max(confidence_score, 0.85)

    # combined rules
    if ("help" in t or "911" in t) and ("siren" in evt_label or "ambulance" in evt_label):
        reasons.append("Shouting for help while a siren passed nearby — likely emergency situation")
        confidence_score = max(confidence_score, 0.92)

    if not reasons:
        # generic description
        if evt_label:
            reasons.append(f"Detected audio event: {evt_label} (conf {top_event.get('conf'):.2f})")
            confidence_score = max(confidence_score, float(top_event.get('conf', 0)))
        elif t.strip():
            reasons.append("Speech detected: " + (t[:200] + ("..." if len(t) > 200 else "")))
            confidence_score = max(confidence_score, 0.6)
        else:
            reasons.append("No strong event or speech detected (quiet / low energy).")
            confidence_score = 0.2

    # build inference text
    inference = "; ".join(reasons) + f" | estimated_confidence: {confidence_score:.2f}"
    return inference
