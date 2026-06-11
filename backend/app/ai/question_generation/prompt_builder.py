"""
EXAMOS - Prompt Builder
Constructs structured prompts for Gemini API to generate exam questions.
"""


def build_question_generation_prompt(
    text: str,
    num_questions: int = 10,
    difficulty_range: tuple = (1, 5),
    question_types: list = None,
) -> str:
    """
    Build a structured prompt for the Gemini API to generate exam questions.

    Args:
        text: Source text content to generate questions from
        num_questions: Number of questions to generate
        difficulty_range: Min and max difficulty (1-5)
        question_types: List of question types ("mcq", "theory")

    Returns:
        Formatted prompt string
    """
    if question_types is None:
        question_types = ["mcq"]

    types_str = ", ".join(question_types)

    prompt = f"""You are an expert exam question generator for an educational platform.

Based on the following study material, generate exactly {num_questions} exam questions.

REQUIREMENTS:
- Question types: {types_str}
- Difficulty range: {difficulty_range[0]} to {difficulty_range[1]} (1=easiest, 5=hardest)
- Distribute difficulties evenly across the range
- Each question must be directly answerable from the provided material
- For MCQ questions: provide exactly 4 options (A, B, C, D)
- Include the correct answer for each question
- Identify the topic/subject area for each question
- Provide a brief explanation for the correct answer

RESPOND WITH VALID JSON ONLY. No markdown, no code blocks, just the JSON array.

Format your response as a JSON array with this exact structure:
[
  {{
    "text": "Question text here?",
    "question_type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "difficulty": 3,
    "topic": "Topic Name",
    "explanation": "Brief explanation of why this is correct"
  }}
]

For theory questions, set options to null and provide a model answer as correct_answer.

STUDY MATERIAL:
---
{text[:4000]}
---

Generate exactly {num_questions} questions now. RESPOND WITH VALID JSON ONLY:"""

    return prompt
