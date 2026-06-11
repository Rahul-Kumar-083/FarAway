"""
EXAMOS - User Model
Supports three roles: student, teacher, admin.
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from app.database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # student, teacher, admin
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
