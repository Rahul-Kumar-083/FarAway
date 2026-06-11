"""
EXAMOS - Auth Routes
Login endpoint with seeded demo users (no registration for MVP).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas import LoginRequest, LoginResponse, UserResponse
from app.services.auth_service import authenticate_user, create_access_token
from app.middleware.auth_middleware import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user with email and password.
    Returns JWT access token on success.
    
    Demo credentials:
    - Teacher: teacher@examos.ai / teacher123
    - Student: student@examos.ai / student123
    - Admin: admin@examos.ai / admin123
    """
    user = await authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id, user.role)
    return LoginResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse.model_validate(user)
