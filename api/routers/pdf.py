"""PDF generation router for internal API calls.

Handles PDF generation requests from the web frontend.
This is an internal endpoint called server-side after payment confirmation.
"""

import os
from typing import Any

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

from services.pdf_generator import (
    PDFGenerationError,
    generate_pdf,
    upload_to_storage,
)

router = APIRouter(prefix="/pdf", tags=["pdf"])

# Internal API key for server-to-server calls
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "dev-internal-key")


class GeneratePDFRequest(BaseModel):
    """Request model for PDF generation."""

    optimization_id: str = Field(description="ID of the optimization record")
    user_id: str = Field(description="ID of the user")
    optimized_cv: dict[str, Any] = Field(
        description="The cv_optimizado section from Claude analysis"
    )
    user_name: str | None = Field(default=None, description="User's name for PDF header")
    user_email: str | None = Field(default=None, description="User's email for PDF header")


class GeneratePDFResponse(BaseModel):
    """Response model for PDF generation."""

    success: bool
    storage_path: str | None = None
    error: str | None = None


@router.post("/generate", response_model=GeneratePDFResponse)
async def generate_pdf_endpoint(
    request: GeneratePDFRequest,
    x_internal_key: str = Header(alias="X-Internal-Key"),
) -> GeneratePDFResponse:
    """Generate a PDF from optimized CV content and upload to storage.

    This is an internal endpoint called by the web backend after payment.
    Requires X-Internal-Key header for authentication.

    Args:
        request: PDF generation request with optimization data
        x_internal_key: Internal API key for authentication

    Returns:
        Response with storage path or error

    Raises:
        HTTPException: 401 if unauthorized, 500 on generation failure
    """
    # Validate internal API key
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Token inválido",
        )

    try:
        # Generate PDF
        pdf_bytes = generate_pdf(
            optimized_cv=request.optimized_cv,
            user_name=request.user_name,
            user_email=request.user_email,
        )

        # Upload to Supabase Storage
        storage_path = await upload_to_storage(
            pdf_bytes=pdf_bytes,
            user_id=request.user_id,
            optimization_id=request.optimization_id,
        )

        return GeneratePDFResponse(
            success=True,
            storage_path=storage_path,
        )

    except PDFGenerationError as e:
        return GeneratePDFResponse(
            success=False,
            error=e.message,
        )

    except Exception:
        return GeneratePDFResponse(
            success=False,
            error="Error interno generando PDF",
        )
