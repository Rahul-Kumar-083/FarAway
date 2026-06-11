"""
EXAMOS - Pydantic Schemas
Request/response models for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ═══════════════════════════════════════════
# Auth Schemas
# ═══════════════════════════════════════════

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# Exam Schemas
# ═══════════════════════════════════════════

class ExamCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    duration_minutes: int = Field(default=30, ge=5, le=180)
    is_adaptive: bool = True


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    is_adaptive: Optional[bool] = None


class ExamResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    teacher_id: int
    duration_minutes: int
    is_active: bool
    is_adaptive: bool
    total_questions: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# Question Schemas
# ═══════════════════════════════════════════

class QuestionCreate(BaseModel):
    text: str
    question_type: str = "mcq"
    options: Optional[List[str]] = None
    correct_answer: str
    difficulty: int = Field(default=3, ge=1, le=5)
    topic: Optional[str] = None
    explanation: Optional[str] = None


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    difficulty: Optional[int] = Field(default=None, ge=1, le=5)
    topic: Optional[str] = None
    explanation: Optional[str] = None


class QuestionResponse(BaseModel):
    id: int
    exam_id: int
    text: str
    question_type: str
    options: Optional[List[str]]
    correct_answer: Optional[str] = None  # Hidden from students during exam
    difficulty: int
    topic: Optional[str]
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionForStudent(BaseModel):
    """Question response with correct answer hidden."""
    id: int
    text: str
    question_type: str
    options: Optional[List[str]]
    difficulty: int
    topic: Optional[str]


# ═══════════════════════════════════════════
# Attempt Schemas
# ═══════════════════════════════════════════

class StartExamRequest(BaseModel):
    exam_id: int


class SubmitAnswerRequest(BaseModel):
    question_id: int
    selected_answer: str
    time_taken_seconds: int = 0


class SubmitExamRequest(BaseModel):
    attempt_id: int
    auto_submitted: bool = False


class AttemptResponse(BaseModel):
    id: int
    student_id: int
    exam_id: int
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    score: Optional[float]
    total_correct: int
    total_answered: int
    trust_score: float
    current_difficulty: int
    is_completed: bool
    is_auto_submitted: bool

    class Config:
        from_attributes = True


class AnswerResponse(BaseModel):
    id: int
    question_id: int
    selected_answer: Optional[str]
    is_correct: Optional[bool]
    time_taken_seconds: int
    difficulty_at_time: int

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════
# Monitoring Schemas
# ═══════════════════════════════════════════

class MonitoringEventCreate(BaseModel):
    attempt_id: int
    event_type: str  # tab_switch, fullscreen_exit, multiple_faces, no_face
    severity: str = "low"
    details: Optional[dict] = None


class MonitoringEventResponse(BaseModel):
    id: int
    attempt_id: int
    event_type: str
    severity: str
    trust_score_impact: float
    details: Optional[dict]
    timestamp: Optional[datetime]

    class Config:
        from_attributes = True


class TrustScoreUpdate(BaseModel):
    attempt_id: int
    trust_score: float
    event_type: str
    severity: str


# ═══════════════════════════════════════════
# Analytics Schemas
# ═══════════════════════════════════════════

class TopicAccuracy(BaseModel):
    topic: str
    correct: int
    total: int
    accuracy: float


class DifficultyDistribution(BaseModel):
    difficulty: int
    count: int
    correct: int
    accuracy: float


class StudentAnalytics(BaseModel):
    total_exams: int
    average_score: float
    average_trust_score: float
    topic_accuracy: List[TopicAccuracy]
    difficulty_distribution: List[DifficultyDistribution]
    recent_scores: List[dict]


class ExamAnalytics(BaseModel):
    exam_id: int
    exam_title: str
    total_attempts: int
    average_score: float
    average_trust_score: float
    completion_rate: float
    difficulty_distribution: List[DifficultyDistribution]
    question_stats: List[dict]


# ═══════════════════════════════════════════
# AI Generation Schemas
# ═══════════════════════════════════════════

class GenerateQuestionsRequest(BaseModel):
    num_questions: int = Field(default=10, ge=1, le=50)
    difficulty_range: Optional[List[int]] = [1, 5]
    question_types: List[str] = ["mcq"]


class GenerateQuestionsResponse(BaseModel):
    questions: List[QuestionCreate]
    source: str  # "gemini" or "fallback"
    message: str
