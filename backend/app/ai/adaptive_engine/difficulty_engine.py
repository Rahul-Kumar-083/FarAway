"""
EXAMOS - Adaptive Difficulty Engine
Simple +1/-1 algorithm clamped to 1-5 range.

Logic:
- Correct answer → increase difficulty by 1
- Wrong answer → decrease difficulty by 1
- Difficulty is always clamped between 1 (easiest) and 5 (hardest)
"""


def compute_next_difficulty(current_difficulty: int, is_correct: bool) -> int:
    """
    Compute the next question difficulty level based on the student's answer.
    
    Args:
        current_difficulty: Current difficulty level (1-5)
        is_correct: Whether the student answered correctly
    
    Returns:
        New difficulty level clamped to [1, 5]
    """
    if is_correct:
        new_difficulty = current_difficulty + 1
    else:
        new_difficulty = current_difficulty - 1

    # Clamp to valid range
    return max(1, min(5, new_difficulty))
