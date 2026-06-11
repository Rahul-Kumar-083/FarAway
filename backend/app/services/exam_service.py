"""
EXAMOS - Exam Service
Business logic for exam management, attempt tracking, and answer processing.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam
from app.models.question import Question
from app.models.attempt import ExamAttempt, Answer
from app.schemas import ExamCreate, ExamUpdate, QuestionCreate


async def create_exam(db: AsyncSession, teacher_id: int, data: ExamCreate) -> Exam:
    """Create a new exam."""
    exam = Exam(
        title=data.title,
        description=data.description,
        teacher_id=teacher_id,
        duration_minutes=data.duration_minutes,
        is_adaptive=data.is_adaptive,
    )
    db.add(exam)
    await db.flush()
    await db.refresh(exam)
    return exam


async def get_exam(db: AsyncSession, exam_id: int) -> Optional[Exam]:
    """Get an exam by ID."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    return result.scalar_one_or_none()


async def get_exams_by_teacher(db: AsyncSession, teacher_id: int) -> List[Exam]:
    """Get all exams created by a teacher."""
    result = await db.execute(
        select(Exam).where(Exam.teacher_id == teacher_id).order_by(Exam.created_at.desc())
    )
    return list(result.scalars().all())


async def get_active_exams(db: AsyncSession) -> List[Exam]:
    """Get all active exams (for students)."""
    result = await db.execute(
        select(Exam).where(Exam.is_active == True).order_by(Exam.created_at.desc())
    )
    return list(result.scalars().all())


async def update_exam(db: AsyncSession, exam_id: int, data: ExamUpdate) -> Optional[Exam]:
    """Update an exam."""
    exam = await get_exam(db, exam_id)
    if not exam:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    await db.flush()
    await db.refresh(exam)
    return exam


async def add_questions_to_exam(db: AsyncSession, exam_id: int, questions: List[QuestionCreate]) -> List[Question]:
    """Add multiple questions to an exam."""
    db_questions = []
    for q in questions:
        question = Question(
            exam_id=exam_id,
            text=q.text,
            question_type=q.question_type,
            options=q.options,
            correct_answer=q.correct_answer,
            difficulty=q.difficulty,
            topic=q.topic,
            explanation=q.explanation,
        )
        db.add(question)
        db_questions.append(question)

    # Update total question count
    await db.execute(
        update(Exam).where(Exam.id == exam_id).values(
            total_questions=Exam.total_questions + len(questions)
        )
    )
    await db.flush()
    for q in db_questions:
        await db.refresh(q)
    return db_questions


async def get_exam_questions(db: AsyncSession, exam_id: int) -> List[Question]:
    """Get all questions for an exam."""
    result = await db.execute(
        select(Question).where(Question.exam_id == exam_id).order_by(Question.difficulty)
    )
    return list(result.scalars().all())


async def start_exam_attempt(db: AsyncSession, student_id: int, exam_id: int) -> ExamAttempt:
    """Start a new exam attempt for a student."""
    attempt = ExamAttempt(
        student_id=student_id,
        exam_id=exam_id,
        current_difficulty=3,  # Start at medium difficulty
    )
    db.add(attempt)
    await db.flush()
    await db.refresh(attempt)
    return attempt


async def get_attempt(db: AsyncSession, attempt_id: int) -> Optional[ExamAttempt]:
    """Get an exam attempt by ID."""
    result = await db.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    return result.scalar_one_or_none()


async def get_student_attempts(db: AsyncSession, student_id: int) -> List[ExamAttempt]:
    """Get all exam attempts by a student."""
    result = await db.execute(
        select(ExamAttempt)
        .where(ExamAttempt.student_id == student_id)
        .order_by(ExamAttempt.started_at.desc())
    )
    return list(result.scalars().all())


async def submit_answer(
    db: AsyncSession,
    attempt_id: int,
    question_id: int,
    selected_answer: str,
    time_taken_seconds: int,
) -> Answer:
    """Submit an answer for a question during an exam attempt."""
    # Get the question to check correct answer
    q_result = await db.execute(select(Question).where(Question.id == question_id))
    question = q_result.scalar_one_or_none()

    # Get current attempt for difficulty tracking
    attempt = await get_attempt(db, attempt_id)

    is_correct = question.correct_answer.strip().lower() == selected_answer.strip().lower() if question else False

    answer = Answer(
        attempt_id=attempt_id,
        question_id=question_id,
        selected_answer=selected_answer,
        is_correct=is_correct,
        time_taken_seconds=time_taken_seconds,
        difficulty_at_time=attempt.current_difficulty if attempt else 3,
    )
    db.add(answer)

    # Update attempt stats
    if attempt:
        attempt.total_answered += 1
        if is_correct:
            attempt.total_correct += 1

    await db.flush()
    await db.refresh(answer)
    return answer


async def complete_attempt(db: AsyncSession, attempt_id: int, auto_submitted: bool = False) -> Optional[ExamAttempt]:
    """Mark an exam attempt as completed and calculate final score."""
    attempt = await get_attempt(db, attempt_id)
    if not attempt:
        return None

    attempt.is_completed = True
    attempt.is_auto_submitted = auto_submitted
    attempt.finished_at = datetime.now(timezone.utc)

    # Calculate score as percentage
    if attempt.total_answered > 0:
        attempt.score = round((attempt.total_correct / attempt.total_answered) * 100, 2)
    else:
        attempt.score = 0.0

    await db.flush()
    await db.refresh(attempt)
    return attempt


async def get_attempt_answers(db: AsyncSession, attempt_id: int) -> List[Answer]:
    """Get all answers for an attempt."""
    result = await db.execute(
        select(Answer).where(Answer.attempt_id == attempt_id).order_by(Answer.answered_at)
    )
    return list(result.scalars().all())


async def update_question(db: AsyncSession, question_id: int, data: dict) -> Optional[Question]:
    """Update a question (for teacher review/edit)."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        return None
    for field, value in data.items():
        if hasattr(question, field) and value is not None:
            setattr(question, field, value)
    await db.flush()
    await db.refresh(question)
    return question


async def delete_question(db: AsyncSession, question_id: int) -> bool:
    """Delete a question."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        return False
    await db.delete(question)

    # Update exam question count
    await db.execute(
        update(Exam).where(Exam.id == question.exam_id).values(
            total_questions=Exam.total_questions - 1
        )
    )
    await db.flush()
    return True
