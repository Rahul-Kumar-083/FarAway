"""
EXAMOS - Trust Score Engine
Computes real-time trust score based on anti-cheat events.
No advanced behavioral analysis - just direct event-based deductions.

Trust score starts at 100 and decreases with each suspicious event.
"""

from typing import Dict

# Event type → (trust score deduction, severity)
EVENT_PENALTIES: Dict[str, tuple] = {
    "tab_switch":       (5.0,  "medium"),
    "fullscreen_exit":  (10.0, "high"),
    "multiple_faces":   (15.0, "critical"),
    "no_face":          (8.0,  "high"),
    "suspicious_inactivity": (3.0, "low"),
}


def compute_trust_deduction(event_type: str) -> tuple:
    """
    Get the trust score deduction and severity for an event type.

    Args:
        event_type: Type of anti-cheat event detected

    Returns:
        Tuple of (deduction_amount, severity_label)
    """
    return EVENT_PENALTIES.get(event_type, (2.0, "low"))


def compute_new_trust_score(current_score: float, event_type: str) -> tuple:
    """
    Compute the new trust score after an anti-cheat event.

    Args:
        current_score: Current trust score (0-100)
        event_type: Type of anti-cheat event

    Returns:
        Tuple of (new_trust_score, deduction, severity)
    """
    deduction, severity = compute_trust_deduction(event_type)
    new_score = max(0.0, current_score - deduction)
    return new_score, deduction, severity
