"""
EXAMOS - LLM Question Generator
Calls Gemini API to generate questions, with fallback template-based generation.
"""

import json
import random
import re
import logging
from typing import List, Optional

from app.config.settings import get_settings
from app.ai.question_generation.prompt_builder import build_question_generation_prompt
from app.ai.question_generation.pdf_parser import extract_headings_and_topics
from app.schemas import QuestionCreate

logger = logging.getLogger(__name__)
settings = get_settings()


async def generate_questions_with_gemini(
    text: str,
    num_questions: int = 10,
    difficulty_range: tuple = (1, 5),
    question_types: list = None,
) -> Optional[List[dict]]:
    """
    Generate questions using the Gemini API.

    Returns None if API call fails (triggers fallback).
    """
    if not settings.has_gemini_key:
        logger.info("No Gemini API key configured, using fallback generator")
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = build_question_generation_prompt(
            text=text,
            num_questions=num_questions,
            difficulty_range=difficulty_range,
            question_types=question_types or ["mcq"],
        )

        response = model.generate_content(prompt)
        response_text = response.text.strip()

        # Try to extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group()

        questions = json.loads(response_text)

        if isinstance(questions, list) and len(questions) > 0:
            return questions
        else:
            logger.warning("Gemini returned invalid question format")
            return None

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None


def generate_fallback_questions(
    text: str,
    num_questions: int = 10,
    difficulty_range: tuple = (1, 5),
) -> List[dict]:
    """
    Generate template-based MCQs from extracted topics when Gemini fails.
    Extracts headings/topics and creates simple questions about them.

    This ensures the teacher can still review/edit questions even without AI.
    """
    topics = extract_headings_and_topics(text)

    if not topics:
        # If no topics extracted, use text chunks as topics
        words = text.split()
        # Extract key phrases (capitalized multi-word sequences)
        topics = []
        for i in range(0, len(words) - 2, 10):
            phrase = " ".join(words[i:i+3])
            if len(phrase) > 5:
                topics.append(phrase.title())
        topics = topics[:num_questions] if topics else ["General Knowledge"]

    # Question templates for variety
    templates = [
        {
            "prefix": "Which of the following best describes",
            "options_template": [
                "A comprehensive process involving multiple steps",
                "A simple single-step procedure",
                "An optional consideration",
                "None of the above"
            ],
        },
        {
            "prefix": "What is the primary purpose of",
            "options_template": [
                "To organize and structure information effectively",
                "To eliminate unnecessary complexity",
                "To provide a single solution to all problems",
                "To replace existing methodologies entirely"
            ],
        },
        {
            "prefix": "According to the material, which statement about",
            "suffix": "is most accurate?",
            "options_template": [
                "It plays a fundamental role in the subject area",
                "It is only relevant in specific scenarios",
                "It has been largely deprecated",
                "It requires no prior knowledge to understand"
            ],
        },
    ]

    questions = []
    min_diff, max_diff = difficulty_range

    for i, topic in enumerate(topics[:num_questions]):
        template = templates[i % len(templates)]
        difficulty = min_diff + (i * (max_diff - min_diff)) // max(num_questions - 1, 1)
        difficulty = max(min_diff, min(max_diff, difficulty))

        suffix = template.get("suffix", "?")
        question_text = f'{template["prefix"]} "{topic}" {suffix}'

        # Shuffle options
        options = template["options_template"].copy()
        correct = options[0]  # First option is always the "correct" one
        random.shuffle(options)

        questions.append({
            "text": question_text,
            "question_type": "mcq",
            "options": options,
            "correct_answer": correct,
            "difficulty": difficulty,
            "topic": topic,
            "explanation": f"This question is about {topic}. Please review and edit as needed.",
        })

    return questions


async def generate_questions(
    text: str,
    num_questions: int = 10,
    difficulty_range: tuple = (1, 5),
    question_types: list = None,
) -> tuple:
    """
    Main question generation function. Tries Gemini first, falls back to templates.

    Returns:
        Tuple of (questions_list, source_label, message)
    """
    # Try Gemini API first
    gemini_questions = await generate_questions_with_gemini(
        text, num_questions, difficulty_range, question_types
    )

    if gemini_questions:
        return (
            gemini_questions,
            "gemini",
            f"Successfully generated {len(gemini_questions)} questions using AI"
        )

    # Fallback to template-based generation
    logger.info("Using fallback template-based question generator")
    fallback_questions = generate_fallback_questions(text, num_questions, difficulty_range)

    return (
        fallback_questions,
        "fallback",
        f"Generated {len(fallback_questions)} template-based questions. "
        "Please review and edit before publishing (AI generation was unavailable)."
    )
