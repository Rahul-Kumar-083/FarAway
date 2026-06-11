"""
EXAMOS - Analytics Routes
Endpoints for student, exam, and class-level analytics.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.models.user import User
from app.ai.analytics.analytics_engine import (
    get_student_analytics,
    get_exam_analytics,
    get_class_analytics,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/student")
async def student_analytics(
    user: User = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for the current student."""
    return await get_student_analytics(db, user.id)


@router.get("/student/{student_id}")
async def student_analytics_by_id(
    student_id: int,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for a specific student (teacher/admin only)."""
    return await get_student_analytics(db, student_id)


@router.get("/exam/{exam_id}")
async def exam_analytics(
    exam_id: int,
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for a specific exam (teacher/admin only)."""
    return await get_exam_analytics(db, exam_id)


@router.get("/class")
async def class_analytics(
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get class-level analytics for all exams by the current teacher."""
    return await get_class_analytics(db, user.id)
