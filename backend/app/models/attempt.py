"""
EXAMOS - Attempt & Answer Models
Tracks student exam attempts and individual question answers.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, func
from app.database.connection import Base


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False, index=True)
    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)  # Percentage 0-100
    total_correct = Column(Integer, default=0)
    total_answered = Column(Integer, default=0)
    trust_score = Column(Float, default=100.0)  # 0-100, starts at 100
    current_difficulty = Column(Integer, default=3)  # Current adaptive difficulty level
    is_completed = Column(Boolean, default=False)
    is_auto_submitted = Column(Boolean, default=False)

    def __repr__(self):
        return f"<ExamAttempt student={self.student_id} exam={self.exam_id}>"


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_answer = Column(String(1000), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    time_taken_seconds = Column(Integer, default=0)
    difficulty_at_time = Column(Integer, default=3)  # Difficulty when this question was served
    answered_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Answer attempt={self.attempt_id} q={self.question_id}>"
