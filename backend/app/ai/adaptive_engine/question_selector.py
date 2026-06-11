"""
EXAMOS - Question Selector
Selects the next question from the pool based on adaptive difficulty.
Prefers questions closest to the target difficulty, avoiding repeats.
"""

from typing import List, Optional, Set
import random


def select_next_question(
    questions: list,
    answered_ids: Set[int],
    target_difficulty: int,
) -> Optional[object]:
    """
    Select the next unanswered question closest to the target difficulty.

    Strategy:
    1. Filter out already-answered questions
    2. Group remaining by distance from target difficulty
    3. Pick randomly from the closest group (for variety)

    Args:
        questions: List of Question objects with .id and .difficulty attributes
        answered_ids: Set of question IDs already answered
        target_difficulty: The desired difficulty level (1-5)

    Returns:
        A Question object, or None if no unanswered questions remain
    """
    # Filter unanswered questions
    available = [q for q in questions if q.id not in answered_ids]

    if not available:
        return None

    # Sort by distance from target difficulty
    available.sort(key=lambda q: abs(q.difficulty - target_difficulty))

    # Get the closest difficulty distance
    min_distance = abs(available[0].difficulty - target_difficulty)

    # Collect all questions at the closest distance
    closest = [q for q in available if abs(q.difficulty - target_difficulty) == min_distance]

    # Pick randomly from the closest group for variety
    return random.choice(closest)
