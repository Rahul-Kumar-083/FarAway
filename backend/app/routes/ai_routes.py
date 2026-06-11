"""
EXAMOS - AI Routes
PDF upload and AI question generation endpoint.
"""

import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.middleware.auth_middleware import require_role
from app.models.user import User
from app.config.settings import get_settings
from app.ai.question_generation.pdf_parser import extract_text_from_pdf
from app.ai.question_generation.llm_generator import generate_questions
from app.ai.question_generation.validator import validate_questions
from app.schemas import GenerateQuestionsResponse, QuestionCreate

settings = get_settings()
router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions_from_pdf(
    file: UploadFile = File(...),
    num_questions: int = Form(default=10),
    user: User = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF and generate exam questions using AI.
    
    Falls back to template-based generation if Gemini API is unavailable.
    Teacher should review and edit generated questions before publishing.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Validate file size
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit"
        )

    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    try:
        # Extract text from PDF
        text = extract_text_from_pdf(file_path)
        if not text or len(text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from the PDF"
            )

        # Generate questions (Gemini with fallback)
        questions_data, source, message = await generate_questions(
            text=text,
            num_questions=min(num_questions, 50),
            difficulty_range=(1, 5),
            question_types=["mcq"],
        )

        # Validate generated questions
        valid_questions = validate_questions(questions_data)

        if not valid_questions:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate valid questions from the uploaded content"
            )

        return GenerateQuestionsResponse(
            questions=valid_questions,
            source=source,
            message=message,
        )

    finally:
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
