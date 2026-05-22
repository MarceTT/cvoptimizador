"""PDF Generator service using ReportLab for ATS-friendly CV output.

Creates clean, professional PDFs optimized for ATS parsing:
- A4 page size with 2cm margins
- Helvetica font family (ATS-friendly)
- Section headers in blue (#2563EB)
- No tables, columns, or icons (ATS-friendly)
- Clear section hierarchy: Name, Contact, Summary, Experience, Skills, Education
"""

import io
import os
from dataclasses import dataclass
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

# Supabase Storage configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
STORAGE_BUCKET = "cv-pdfs"

# Design constants
PRIMARY_COLOR = colors.HexColor("#2563EB")
TEXT_COLOR = colors.HexColor("#1F2937")
MARGIN = 2 * cm


class PDFGenerationError(Exception):
    """Custom exception for PDF generation errors."""

    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(message)


@dataclass
class CVContent:
    """Structured CV content for PDF generation."""

    name: str
    email: str
    phone: str | None = None
    linkedin: str | None = None
    summary: str = ""
    experience: str = ""
    skills: str = ""
    education: str = ""


def _get_styles() -> dict[str, ParagraphStyle]:
    """Create custom paragraph styles for the CV.

    Returns:
        Dictionary of named ParagraphStyle objects
    """
    styles = getSampleStyleSheet()

    return {
        "name": ParagraphStyle(
            "CVName",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=TEXT_COLOR,
            spaceAfter=4,
            alignment=TA_LEFT,
        ),
        "contact": ParagraphStyle(
            "CVContact",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=colors.HexColor("#6B7280"),
            spaceAfter=12,
        ),
        "section_header": ParagraphStyle(
            "CVSectionHeader",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=PRIMARY_COLOR,
            spaceBefore=16,
            spaceAfter=8,
            borderWidth=0,
            borderPadding=0,
        ),
        "body": ParagraphStyle(
            "CVBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=TEXT_COLOR,
            leading=14,
            spaceAfter=6,
        ),
        "skill_item": ParagraphStyle(
            "CVSkillItem",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=TEXT_COLOR,
            leading=12,
        ),
    }


def _sanitize_text(text: str) -> str:
    """Sanitize text for ReportLab paragraphs.

    Escapes HTML-like characters that could break Platypus rendering.

    Args:
        text: Raw text to sanitize

    Returns:
        Sanitized text safe for Paragraph
    """
    # Replace characters that could break XML parsing
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    # Convert newlines to breaks for proper rendering
    text = text.replace("\n\n", "<br/><br/>")
    text = text.replace("\n", "<br/>")
    return text


def _build_cv_content(optimized_cv: dict[str, Any]) -> CVContent:
    """Extract CV content from optimized analysis result.

    Args:
        optimized_cv: The cv_optimizado dict from Claude analysis

    Returns:
        Structured CVContent for PDF generation
    """
    # Extract sections with defaults
    summary = optimized_cv.get("summary", "")
    experience = optimized_cv.get("experience", "")
    skills = optimized_cv.get("skills", "")

    return CVContent(
        name="[Tu Nombre]",  # Placeholder - would come from original CV
        email="[tu@email.com]",  # Placeholder
        summary=summary,
        experience=experience,
        skills=skills,
        education="",  # Not in current optimization, can be added later
    )


def generate_pdf(
    optimized_cv: dict[str, Any],
    user_name: str | None = None,
    user_email: str | None = None,
) -> bytes:
    """Generate an ATS-friendly PDF from optimized CV content.

    Args:
        optimized_cv: The cv_optimizado section from Claude analysis
            (contains summary, experience, skills)
        user_name: Optional name override
        user_email: Optional email override

    Returns:
        PDF file as bytes

    Raises:
        PDFGenerationError: If PDF generation fails
    """
    try:
        # Build CV content from optimization result
        cv = _build_cv_content(optimized_cv)

        # Override with user info if provided
        if user_name:
            cv.name = user_name
        if user_email:
            cv.email = user_email

        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=MARGIN,
            bottomMargin=MARGIN,
        )

        # Get styles
        styles = _get_styles()

        # Build document content
        story: list = []

        # Name
        story.append(Paragraph(_sanitize_text(cv.name), styles["name"]))

        # Contact info
        contact_parts = [cv.email]
        if cv.phone:
            contact_parts.append(cv.phone)
        if cv.linkedin:
            contact_parts.append(cv.linkedin)
        contact_line = " | ".join(contact_parts)
        story.append(Paragraph(_sanitize_text(contact_line), styles["contact"]))

        story.append(Spacer(1, 8))

        # Summary section
        if cv.summary:
            story.append(Paragraph("RESUMEN PROFESIONAL", styles["section_header"]))
            story.append(Paragraph(_sanitize_text(cv.summary), styles["body"]))

        # Experience section
        if cv.experience:
            story.append(Paragraph("EXPERIENCIA LABORAL", styles["section_header"]))
            story.append(Paragraph(_sanitize_text(cv.experience), styles["body"]))

        # Skills section
        if cv.skills:
            story.append(Paragraph("HABILIDADES", styles["section_header"]))
            story.append(Paragraph(_sanitize_text(cv.skills), styles["body"]))

        # Education section
        if cv.education:
            story.append(Paragraph("EDUCACIÓN", styles["section_header"]))
            story.append(Paragraph(_sanitize_text(cv.education), styles["body"]))

        # Build PDF
        doc.build(story)

        # Get bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    except Exception as e:
        raise PDFGenerationError(
            message="Error generando PDF",
            code="generation_failed",
        ) from e


async def upload_to_storage(
    pdf_bytes: bytes,
    user_id: str,
    optimization_id: str,
) -> str:
    """Upload PDF to Supabase Storage.

    Args:
        pdf_bytes: Generated PDF content
        user_id: User ID for path organization
        optimization_id: Optimization ID for filename

    Returns:
        Storage path where PDF was uploaded

    Raises:
        PDFGenerationError: If upload fails
    """
    try:
        from supabase import create_client

        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise PDFGenerationError(
                message="Configuración de storage incompleta",
                code="storage_config_error",
            )

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        # Path format: {user_id}/{optimization_id}.pdf
        storage_path = f"{user_id}/{optimization_id}.pdf"

        # Upload to storage
        client.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )

        return storage_path

    except PDFGenerationError:
        raise
    except Exception as e:
        raise PDFGenerationError(
            message="Error subiendo PDF",
            code="upload_failed",
        ) from e


async def get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    """Generate a signed URL for PDF download.

    Args:
        storage_path: Path to the file in storage
        expires_in: URL expiration time in seconds (default: 1 hour)

    Returns:
        Signed URL for download

    Raises:
        PDFGenerationError: If URL generation fails
    """
    try:
        from supabase import create_client

        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise PDFGenerationError(
                message="Configuración de storage incompleta",
                code="storage_config_error",
            )

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        result = client.storage.from_(STORAGE_BUCKET).create_signed_url(
            path=storage_path,
            expires_in=expires_in,
        )

        if not result or "signedURL" not in result:
            raise PDFGenerationError(
                message="Error generando URL de descarga",
                code="signed_url_failed",
            )

        return result["signedURL"]

    except PDFGenerationError:
        raise
    except Exception as e:
        raise PDFGenerationError(
            message="Error generando URL de descarga",
            code="signed_url_failed",
        ) from e


async def delete_pdf(storage_path: str) -> bool:
    """Delete a PDF from Supabase Storage.

    Used by cleanup utilities for expired PDFs.

    Args:
        storage_path: Path to the file in storage

    Returns:
        True if deleted successfully
    """
    try:
        from supabase import create_client

        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            return False

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        client.storage.from_(STORAGE_BUCKET).remove([storage_path])

        return True

    except Exception:
        return False
