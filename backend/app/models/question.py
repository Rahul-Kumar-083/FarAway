"""
EXAMOS - Question Model
Stores exam questions with difficulty levels (1-5) for adaptive engine.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, func
from app.database.connection import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False, default="mcq")  # mcq, theory
    options = Column(JSON, nullable=True)  # List of option strings for MCQ
    correct_answer = Column(Text, nullable=False)
    difficulty = Column(Integer, nullable=False, default=3)  # 1 (easy) to 5 (hard)
    topic = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Question {self.id} (diff={self.difficulty})>"
