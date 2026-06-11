"""
EXAMOS - Main Application Entry Point
AI Adaptive Examination & Integrity Platform

FastAPI application with:
- JWT authentication
- Exam CRUD & adaptive engine
- AI question generation (Gemini + fallback)
- Anti-cheat monitoring via WebSocket
- Analytics dashboard APIs
- Swagger docs at /docs
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.database.connection import init_db, async_session
from app.database.seed import seed_database

# Import all models so they register with Base.metadata
import app.models  # noqa: F401

# Import route modules
from app.routes.auth_routes import router as auth_router
from app.routes.exam_routes import router as exam_router
from app.routes.ai_routes import router as ai_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.monitoring_routes import router as monitoring_router
from app.routes.websocket_routes import router as ws_router

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("[START] Starting EXAMOS Backend...")
    await init_db()
    logger.info("[OK] Database tables created")

    # Seed demo data
    async with async_session() as db:
        await seed_database(db)
    logger.info("[OK] Demo data seeded")

    logger.info(f"[INFO] API docs available at http://localhost:{settings.BACKEND_PORT}/docs")
    logger.info(f"[KEY] Gemini API: {'configured' if settings.has_gemini_key else 'not configured (using fallback)'}")

    yield

    # Shutdown
    logger.info("[STOP] EXAMOS Backend shutting down")


app = FastAPI(
    title="EXAMOS",
    description="AI Adaptive Examination & Integrity Platform - Future AI Infrastructure for Examinations",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth_router)
app.include_router(exam_router)
app.include_router(ai_router)
app.include_router(analytics_router)
app.include_router(monitoring_router)
app.include_router(ws_router)


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "name": "EXAMOS",
        "version": "1.0.0",
        "status": "operational",
        "description": "AI Adaptive Examination & Integrity Platform",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
        "gemini_api": "configured" if settings.has_gemini_key else "fallback_mode",
    }
