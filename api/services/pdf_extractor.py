"""PDF text extraction service using PyMuPDF.

Handles various PDF edge cases with appropriate error messages in Spanish.
"""

from dataclasses import dataclass
from typing import BinaryIO

import fitz  # PyMuPDF


class PDFExtractionError(Exception):
    """Custom exception for PDF extraction errors."""

    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(message)


@dataclass
class ExtractionResult:
    """Result of PDF text extraction."""

    text: str
    page_count: int
    char_count: int


# Error messages in Spanish
ERRORS = {
    "oversized": "Archivo muy grande (máx 5MB)",
    "protected": "PDF protegido, removí la contraseña",
    "corrupt": "Archivo corrupto o inválido",
    "image_only": "PDF sin texto legible (escaneado?)",
    "too_long": "CV muy largo (máx 10 páginas)",
    "insufficient": "CV sin contenido suficiente",
}

# Limits
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_PAGES = 10
MIN_CHARS_PER_PAGE = 100  # Minimum average chars per page to not be "image only"
MIN_TOTAL_CHARS = 200  # Minimum total chars for meaningful content


def extract_text_from_pdf(
    file_content: bytes | BinaryIO,
    filename: str = "cv.pdf",
) -> ExtractionResult:
    """Extract text content from a PDF file.

    Args:
        file_content: PDF file bytes or file-like object
        filename: Original filename (for error messages)

    Returns:
        ExtractionResult with extracted text and metadata

    Raises:
        PDFExtractionError: If the PDF cannot be processed
    """
    # Convert to bytes if needed
    if hasattr(file_content, "read"):
        file_bytes = file_content.read()
    else:
        file_bytes = file_content

    # Check file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise PDFExtractionError(ERRORS["oversized"], "oversized")

    # Try to open the PDF
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except fitz.fitz.FileDataError:
        raise PDFExtractionError(ERRORS["corrupt"], "corrupt")
    except Exception as e:
        # Handle password-protected or other errors
        if "password" in str(e).lower() or "encrypted" in str(e).lower():
            raise PDFExtractionError(ERRORS["protected"], "protected")
        raise PDFExtractionError(ERRORS["corrupt"], "corrupt")

    try:
        # Check if password-protected
        if doc.is_encrypted:
            raise PDFExtractionError(ERRORS["protected"], "protected")

        # Check page count
        page_count = len(doc)
        if page_count > MAX_PAGES:
            raise PDFExtractionError(ERRORS["too_long"], "too_long")

        if page_count == 0:
            raise PDFExtractionError(ERRORS["corrupt"], "corrupt")

        # Extract text from all pages
        text_parts: list[str] = []
        for page in doc:
            page_text = page.get_text("text")
            if page_text:
                text_parts.append(page_text.strip())

        full_text = "\n\n".join(text_parts)
        char_count = len(full_text)

        # Check for image-only PDF (very little text per page)
        avg_chars_per_page = char_count / page_count if page_count > 0 else 0
        if avg_chars_per_page < MIN_CHARS_PER_PAGE:
            raise PDFExtractionError(ERRORS["image_only"], "image_only")

        # Check minimum content
        if char_count < MIN_TOTAL_CHARS:
            raise PDFExtractionError(ERRORS["insufficient"], "insufficient")

        return ExtractionResult(
            text=full_text,
            page_count=page_count,
            char_count=char_count,
        )

    finally:
        doc.close()


def validate_cv_content(text: str) -> None:
    """Validate that extracted text has enough content for analysis.

    Args:
        text: Extracted CV text

    Raises:
        PDFExtractionError: If content is insufficient
    """
    if len(text.strip()) < MIN_TOTAL_CHARS:
        raise PDFExtractionError(ERRORS["insufficient"], "insufficient")
