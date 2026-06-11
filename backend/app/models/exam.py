"""
EXAMOS - Exam Model
Represents an examination created by a teacher.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, func
from app.database.connection import Base


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, default=False)
    is_adaptive = Column(Boolean, default=True)
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Exam {self.title}>"
