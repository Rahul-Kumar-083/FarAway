"""
EXAMOS - Monitoring Event Model
Records anti-cheat events during exam attempts.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, JSON, func
from app.database.connection import Base


class MonitoringEvent(Base):
    __tablename__ = "monitoring_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    # Event types: tab_switch, fullscreen_exit, multiple_faces, no_face, suspicious_inactivity
    severity = Column(String(20), nullable=False, default="low")  # low, medium, high, critical
    trust_score_impact = Column(Float, default=0.0)  # How much this event reduced trust score
    details = Column(JSON, nullable=True)  # Additional context about the event
    timestamp = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<MonitoringEvent {self.event_type} ({self.severity})>"
