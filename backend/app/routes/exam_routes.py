"""
EXAMOS - Exam Routes
CRUD operations for exams, questions, and exam attempts.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.models.user import User
from app.schemas import (
    ExamCreate, ExamUpdate, ExamResponse,
    QuestionCreate, QuestionUpdate, QuestionResponse, QuestionForStudent,
    StartExamRequest, SubmitAnswerRequest, SubmitExamRequest,
    AttemptResponse, AnswerResponse,
)
from app.services import exam_service
from app.ai.adaptive_engine.difficulty_engine import compute_next_difficulty
from app.ai.adaptive_engine.question_selector import select_next_question

router = APIRouter(prefix="/api/exams", tags=["Exams"])


# ═══════════════════════════════════════════
# Exam CRUD (Teacher)
# ═══════════════════════════════════════════

@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new exam (teacher/admin only)."""
    exam = await exam_service.create_exam(db, user.id, data)
    return ExamResponse.model_validate(exam)


@router.get("/", response_model=List[ExamResponse])
async def list_exams(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List exams. Teachers see their own, students see active exams."""
    if user.role in ("teacher", "admin"):
        exams = await exam_service.get_exams_by_teacher(db, user.id)
    else:
        exams = await exam_service.get_active_exams(db)
    return [ExamResponse.model_validate(e) for e in exams]


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get exam details."""
    exam = await exam_service.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ExamResponse.model_validate(exam)


@router.patch("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    data: ExamUpdate,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update an exam (teacher/admin only)."""
    exam = await exam_service.update_exam(db, exam_id, data)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ExamResponse.model_validate(exam)


# ═══════════════════════════════════════════
# Questions
# ═══════════════════════════════════════════

@router.get("/{exam_id}/questions", response_model=List[QuestionResponse])
async def get_questions(
    exam_id: int,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get all questions for an exam (teacher view with answers)."""
    questions = await exam_service.get_exam_questions(db, exam_id)
    return [QuestionResponse.model_validate(q) for q in questions]


@router.post("/{exam_id}/questions", response_model=List[QuestionResponse], status_code=201)
async def add_questions(
    exam_id: int,
    questions: List[QuestionCreate],
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Add questions to an exam (teacher/admin only)."""
    exam = await exam_service.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    created = await exam_service.add_questions_to_exam(db, exam_id, questions)
    return [QuestionResponse.model_validate(q) for q in created]


@router.patch("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update a question (teacher review/edit)."""
    question = await exam_service.update_question(db, question_id, data.model_dump(exclude_unset=True))
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse.model_validate(question)


@router.delete("/questions/{question_id}", status_code=204)
async def delete_question(
    question_id: int,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a question."""
    if not await exam_service.delete_question(db, question_id):
        raise HTTPException(status_code=404, detail="Question not found")


# ═══════════════════════════════════════════
# Exam Attempts (Student)
# ═══════════════════════════════════════════

@router.post("/attempts/start", response_model=AttemptResponse)
async def start_exam(
    data: StartExamRequest,
    user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Start an exam attempt (student only)."""
    exam = await exam_service.get_exam(db, data.exam_id)
    if not exam or not exam.is_active:
        raise HTTPException(status_code=404, detail="Exam not found or not active")
    attempt = await exam_service.start_exam_attempt(db, user.id, data.exam_id)
    return AttemptResponse.model_validate(attempt)


@router.get("/attempts/my", response_model=List[AttemptResponse])
async def my_attempts(
    user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Get all exam attempts by the current student."""
    attempts = await exam_service.get_student_attempts(db, user.id)
    return [AttemptResponse.model_validate(a) for a in attempts]


@router.get("/attempts/{attempt_id}", response_model=AttemptResponse)
async def get_attempt(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get an attempt's details."""
    attempt = await exam_service.get_attempt(db, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return AttemptResponse.model_validate(attempt)


@router.post("/attempts/{attempt_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    attempt_id: int,
    data: SubmitAnswerRequest,
    user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Submit an answer during an exam. Returns adaptive difficulty update."""
    attempt = await exam_service.get_attempt(db, attempt_id)
    if not attempt or attempt.is_completed:
        raise HTTPException(status_code=400, detail="Attempt not found or already completed")

    answer = await exam_service.submit_answer(
        db, attempt_id, data.question_id, data.selected_answer, data.time_taken_seconds
    )

    # Adaptive difficulty: simple +1/-1 clamped to 1-5
    new_difficulty = compute_next_difficulty(
        current_difficulty=attempt.current_difficulty,
        is_correct=answer.is_correct,
    )
    attempt.current_difficulty = new_difficulty
    await db.flush()

    return AnswerResponse.model_validate(answer)


@router.get("/attempts/{attempt_id}/next-question", response_model=QuestionForStudent)
async def get_next_question(
    attempt_id: int,
    user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Get the next adaptively-selected question for the attempt."""
    attempt = await exam_service.get_attempt(db, attempt_id)
    if not attempt or attempt.is_completed:
        raise HTTPException(status_code=400, detail="Attempt not found or already completed")

    # Get all questions for this exam
    all_questions = await exam_service.get_exam_questions(db, attempt.exam_id)

    # Get already answered question IDs
    answered = await exam_service.get_attempt_answers(db, attempt_id)
    answered_ids = {a.question_id for a in answered}

    # Select next question based on current adaptive difficulty
    question = select_next_question(
        questions=all_questions,
        answered_ids=answered_ids,
        target_difficulty=attempt.current_difficulty,
    )

    if question is None:
        raise HTTPException(status_code=404, detail="No more questions available")

    return QuestionForStudent(
        id=question.id,
        text=question.text,
        question_type=question.question_type,
        options=question.options,
        difficulty=question.difficulty,
        topic=question.topic,
    )


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResponse)
async def submit_exam(
    attempt_id: int,
    auto_submitted: bool = False,
    user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Submit/finish an exam attempt. Calculates final score."""
    attempt = await exam_service.complete_attempt(db, attempt_id, auto_submitted)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return AttemptResponse.model_validate(attempt)


@router.get("/attempts/{attempt_id}/answers", response_model=List[AnswerResponse])
async def get_attempt_answers(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all answers for an attempt (for results page)."""
    answers = await exam_service.get_attempt_answers(db, attempt_id)
    return [AnswerResponse.model_validate(a) for a in answers]
