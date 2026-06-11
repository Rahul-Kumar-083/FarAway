"""
EXAMOS - Monitoring Routes
REST endpoints for anti-cheat event reporting and trust score retrieval.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.middleware.auth_middleware import get_current_user, require_role
from app.models.user import User
from app.schemas import MonitoringEventCreate, MonitoringEventResponse, TrustScoreUpdate
from app.services.monitoring_service import (
    record_monitoring_event,
    get_attempt_events,
    get_trust_score,
)

router = APIRouter(prefix="/api/monitoring", tags=["Monitoring"])


@router.post("/events", response_model=MonitoringEventResponse)
async def report_event(
    data: MonitoringEventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Report an anti-cheat monitoring event. Updates trust score automatically."""
    event, new_trust_score = await record_monitoring_event(
        db,
        attempt_id=data.attempt_id,
        event_type=data.event_type,
        details=data.details,
    )
    if not event:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return MonitoringEventResponse.model_validate(event)


@router.get("/events/{attempt_id}", response_model=List[MonitoringEventResponse])
async def get_events(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all monitoring events for an attempt."""
    events = await get_attempt_events(db, attempt_id)
    return [MonitoringEventResponse.model_validate(e) for e in events]


@router.get("/trust-score/{attempt_id}")
async def get_attempt_trust_score(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current trust score for an attempt."""
    score = await get_trust_score(db, attempt_id)
    return {"attempt_id": attempt_id, "trust_score": score}
