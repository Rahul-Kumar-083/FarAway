"""
EXAMOS - Monitoring Service
Handles anti-cheat event recording and trust score updates.
"""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.monitoring import MonitoringEvent
from app.models.attempt import ExamAttempt
from app.ai.anti_cheat.trust_score_engine import compute_new_trust_score


async def record_monitoring_event(
    db: AsyncSession,
    attempt_id: int,
    event_type: str,
    details: dict = None,
) -> tuple:
    """
    Record a monitoring event and update the attempt's trust score.

    Returns:
        Tuple of (MonitoringEvent, new_trust_score)
    """
    # Get current attempt
    result = await db.execute(select(ExamAttempt).where(ExamAttempt.id == attempt_id))
    attempt = result.scalar_one_or_none()
    if not attempt:
        return None, 0

    # Compute trust score impact
    new_score, deduction, severity = compute_new_trust_score(
        attempt.trust_score, event_type
    )

    # Record the event
    event = MonitoringEvent(
        attempt_id=attempt_id,
        event_type=event_type,
        severity=severity,
        trust_score_impact=deduction,
        details=details,
    )
    db.add(event)

    # Update attempt trust score
    attempt.trust_score = new_score
    await db.flush()
    await db.refresh(event)

    return event, new_score


async def get_attempt_events(db: AsyncSession, attempt_id: int) -> List[MonitoringEvent]:
    """Get all monitoring events for an attempt."""
    result = await db.execute(
        select(MonitoringEvent)
        .where(MonitoringEvent.attempt_id == attempt_id)
        .order_by(MonitoringEvent.timestamp.desc())
    )
    return list(result.scalars().all())


async def get_trust_score(db: AsyncSession, attempt_id: int) -> float:
    """Get the current trust score for an attempt."""
    result = await db.execute(
        select(ExamAttempt.trust_score).where(ExamAttempt.id == attempt_id)
    )
    score = result.scalar_one_or_none()
    return score if score is not None else 100.0
