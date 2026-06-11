"""
EXAMOS - Question Validator
Validates AI-generated questions before saving to database.
"""

from typing import List, Dict, Optional
from app.schemas import QuestionCreate


def validate_question(question_data: dict) -> Optional[QuestionCreate]:
    """
    Validate a single question dictionary and convert to QuestionCreate schema.

    Checks:
    - Required fields are present
    - MCQ has exactly 4 options
    - Correct answer is among the options (for MCQ)
    - Difficulty is in range 1-5

    Returns QuestionCreate if valid, None if invalid.
    """
    try:
        text = question_data.get("text", "").strip()
        if not text or len(text) < 5:
            return None

        q_type = question_data.get("question_type", "mcq")
        options = question_data.get("options")
        correct_answer = str(question_data.get("correct_answer", "")).strip()
        difficulty = int(question_data.get("difficulty", 3))
        topic = question_data.get("topic", "General")
        explanation = question_data.get("explanation", "")

        # Clamp difficulty
        difficulty = max(1, min(5, difficulty))

        # Validate MCQ options
        if q_type == "mcq":
            if not options or not isinstance(options, list):
                return None
            # Ensure at least 2 options
            options = [str(o).strip() for o in options if str(o).strip()]
            if len(options) < 2:
                return None
            # If correct answer not in options, add it
            if correct_answer and correct_answer not in options:
                if len(options) >= 4:
                    options[-1] = correct_answer
                else:
                    options.append(correct_answer)

        if not correct_answer:
            return None

        return QuestionCreate(
            text=text,
            question_type=q_type,
            options=options if q_type == "mcq" else None,
            correct_answer=correct_answer,
            difficulty=difficulty,
            topic=topic,
            explanation=explanation,
        )

    except (ValueError, TypeError, KeyError):
        return None


def validate_questions(questions_data: List[dict]) -> List[QuestionCreate]:
    """
    Validate a batch of questions and return only valid ones.
    """
    valid = []
    for q_data in questions_data:
        result = validate_question(q_data)
        if result:
            valid.append(result)
    return valid
