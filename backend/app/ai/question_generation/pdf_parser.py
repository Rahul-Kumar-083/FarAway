"""
EXAMOS - PDF Parser
Extracts text content from uploaded PDF files using PyMuPDF.
"""

import fitz  # PyMuPDF
from typing import List, Dict
import re


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract all text content from a PDF file.

    Args:
        file_path: Path to the PDF file

    Returns:
        Extracted text as a single string
    """
    doc = fitz.open(file_path)
    text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            text_parts.append(text)

    doc.close()
    return "\n\n".join(text_parts)


def extract_headings_and_topics(text: str) -> List[str]:
    """
    Extract likely headings/topics from text for fallback question generation.
    Looks for lines that are short, capitalized, or followed by blank lines.

    Args:
        text: Full text content

    Returns:
        List of extracted topic strings
    """
    lines = text.split("\n")
    topics = []

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Heuristics for headings:
        # 1. Short lines (< 80 chars) that are title-cased or all caps
        # 2. Lines ending with a colon
        # 3. Lines that are numbered sections (1.1, 2.3, etc.)
        is_heading = False

        if len(line) < 80:
            if line.isupper() and len(line) > 3:
                is_heading = True
            elif line.istitle() and len(line) > 5:
                is_heading = True
            elif line.endswith(":"):
                is_heading = True
            elif re.match(r"^\d+\.?\d*\.?\s+\w+", line):
                is_heading = True

        if is_heading:
            # Clean up the topic
            topic = re.sub(r"^\d+\.?\d*\.?\s+", "", line)
            topic = topic.rstrip(":")
            if len(topic) > 3:
                topics.append(topic)

    return topics[:20]  # Limit to 20 topics


def chunk_text(text: str, max_chunk_size: int = 3000) -> List[str]:
    """
    Split text into chunks for processing by LLM.
    Tries to split on paragraph boundaries.

    Args:
        text: Full text content
        max_chunk_size: Maximum characters per chunk

    Returns:
        List of text chunks
    """
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) > max_chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n\n" + para

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:max_chunk_size]]
