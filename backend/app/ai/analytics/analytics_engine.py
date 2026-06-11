"""
EXAMOS - Analytics Engine
Computes student performance analytics, topic accuracy, and difficulty distribution.
"""

from typing import List, Dict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import ExamAttempt, Answer
from app.models.question import Question
from app.models.exam import Exam


async def get_student_analytics(db: AsyncSession, student_id: int) -> dict:
    """
    Compute comprehensive analytics for a student.
    Includes: total exams, avg score, topic accuracy, difficulty distribution, recent scores.
    """
    # Get all attempts
    result = await db.execute(
        select(ExamAttempt)
        .where(ExamAttempt.student_id == student_id, ExamAttempt.is_completed == True)
        .order_by(ExamAttempt.finished_at.desc())
    )
    attempts = list(result.scalars().all())

    if not attempts:
        return {
            "total_exams": 0,
            "average_score": 0,
            "average_trust_score": 100,
            "topic_accuracy": [],
            "difficulty_distribution": [],
            "recent_scores": [],
        }

    total_exams = len(attempts)
    average_score = sum(a.score or 0 for a in attempts) / total_exams
    average_trust = sum(a.trust_score for a in attempts) / total_exams

    # Get all answers for this student's attempts
    attempt_ids = [a.id for a in attempts]
    ans_result = await db.execute(
        select(Answer, Question)
        .join(Question, Answer.question_id == Question.id)
        .where(Answer.attempt_id.in_(attempt_ids))
    )
    rows = ans_result.all()

    # Topic accuracy
    topic_stats: Dict[str, Dict] = {}
    diff_stats: Dict[int, Dict] = {i: {"count": 0, "correct": 0} for i in range(1, 6)}

    for answer, question in rows:
        topic = question.topic or "General"
        if topic not in topic_stats:
            topic_stats[topic] = {"correct": 0, "total": 0}
        topic_stats[topic]["total"] += 1
        if answer.is_correct:
            topic_stats[topic]["correct"] += 1

        # Difficulty distribution
        diff = question.difficulty
        if diff in diff_stats:
            diff_stats[diff]["count"] += 1
            if answer.is_correct:
                diff_stats[diff]["correct"] += 1

    topic_accuracy = [
        {
            "topic": topic,
            "correct": stats["correct"],
            "total": stats["total"],
            "accuracy": round(stats["correct"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
        }
        for topic, stats in topic_stats.items()
    ]

    difficulty_distribution = [
        {
            "difficulty": diff,
            "count": stats["count"],
            "correct": stats["correct"],
            "accuracy": round(stats["correct"] / stats["count"] * 100, 1) if stats["count"] > 0 else 0,
        }
        for diff, stats in diff_stats.items()
    ]

    # Recent scores (last 10)
    recent_scores = []
    for attempt in attempts[:10]:
        exam_result = await db.execute(select(Exam.title).where(Exam.id == attempt.exam_id))
        exam_title = exam_result.scalar_one_or_none() or "Unknown Exam"
        recent_scores.append({
            "exam_title": exam_title,
            "score": attempt.score,
            "trust_score": attempt.trust_score,
            "date": attempt.finished_at.isoformat() if attempt.finished_at else None,
        })

    return {
        "total_exams": total_exams,
        "average_score": round(average_score, 1),
        "average_trust_score": round(average_trust, 1),
        "topic_accuracy": topic_accuracy,
        "difficulty_distribution": difficulty_distribution,
        "recent_scores": recent_scores,
    }


async def get_exam_analytics(db: AsyncSession, exam_id: int) -> dict:
    """
    Compute analytics for an exam (teacher view).
    Includes: attempt count, avg score, completion rate, question-level stats.
    """
    # Get exam info
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        return {}

    # Get all attempts for this exam
    result = await db.execute(
        select(ExamAttempt).where(ExamAttempt.exam_id == exam_id)
    )
    attempts = list(result.scalars().all())

    completed = [a for a in attempts if a.is_completed]
    total_attempts = len(attempts)
    avg_score = sum(a.score or 0 for a in completed) / len(completed) if completed else 0
    avg_trust = sum(a.trust_score for a in completed) / len(completed) if completed else 100
    completion_rate = len(completed) / total_attempts * 100 if total_attempts > 0 else 0

    # Question-level stats
    questions = await db.execute(
        select(Question).where(Question.exam_id == exam_id)
    )
    question_list = list(questions.scalars().all())

    question_stats = []
    for q in question_list:
        ans_res = await db.execute(
            select(Answer).where(Answer.question_id == q.id)
        )
        answers = list(ans_res.scalars().all())
        total_ans = len(answers)
        correct_ans = sum(1 for a in answers if a.is_correct)
        avg_time = sum(a.time_taken_seconds for a in answers) / total_ans if total_ans > 0 else 0

        question_stats.append({
            "question_id": q.id,
            "text": q.text[:100],
            "difficulty": q.difficulty,
            "topic": q.topic,
            "total_attempts": total_ans,
            "correct_count": correct_ans,
            "accuracy": round(correct_ans / total_ans * 100, 1) if total_ans > 0 else 0,
            "avg_time_seconds": round(avg_time, 1),
        })

    # Sort by accuracy (most difficult first)
    question_stats.sort(key=lambda x: x["accuracy"])

    return {
        "exam_id": exam_id,
        "exam_title": exam.title,
        "total_attempts": total_attempts,
        "average_score": round(avg_score, 1),
        "average_trust_score": round(avg_trust, 1),
        "completion_rate": round(completion_rate, 1),
        "difficulty_distribution": [],
        "question_stats": question_stats,
    }


async def get_class_analytics(db: AsyncSession, teacher_id: int) -> dict:
    """
    Compute class-level analytics for all exams by a teacher.
    """
    # Get teacher's exams
    result = await db.execute(
        select(Exam).where(Exam.teacher_id == teacher_id)
    )
    exams = list(result.scalars().all())

    exam_summaries = []
    total_students = set()

    for exam in exams:
        attempts_result = await db.execute(
            select(ExamAttempt).where(ExamAttempt.exam_id == exam.id)
        )
        attempts = list(attempts_result.scalars().all())
        completed = [a for a in attempts if a.is_completed]

        for a in attempts:
            total_students.add(a.student_id)

        avg_score = sum(a.score or 0 for a in completed) / len(completed) if completed else 0

        exam_summaries.append({
            "exam_id": exam.id,
            "title": exam.title,
            "total_attempts": len(attempts),
            "completed": len(completed),
            "average_score": round(avg_score, 1),
            "is_active": exam.is_active,
        })

    return {
        "total_exams": len(exams),
        "total_students": len(total_students),
        "exam_summaries": exam_summaries,
    }
