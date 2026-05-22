"""CV analysis endpoint with SSE streaming.

Accepts PDF upload + job description, streams progress via SSE,
returns optimization results.
"""

import json
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from middleware.auth import AuthenticatedUser
from services.claude import analyze_cv
from services.pdf_extractor import PDFExtractionError, extract_text_from_pdf

router = APIRouter(prefix="/analyze", tags=["analysis"])

# Limits
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_JD_LENGTH = 10000  # Reasonable limit for job descriptions


async def sse_generator(
    cv_text: str,
    job_description: str,
    optimization_id: str,
    user_id: str,
):
    """Generate SSE events for CV analysis.

    Yields SSE-formatted events for progress and final result.
    """
    # Send initial progress
    yield _format_sse({"type": "progress", "stage": "extracting", "progress": 10})

    # Run Claude analysis
    async for event in analyze_cv(cv_text, job_description):
        if event["type"] == "progress":
            yield _format_sse({
                "type": "progress",
                "stage": event["stage"],
                "progress": event["progress"],
            })

        elif event["type"] == "result":
            # Include the optimization ID in the result
            result_data = event["data"]
            yield _format_sse({
                "type": "result",
                "id": optimization_id,
                "result": {
                    "score_before": result_data["score_ats_antes"],
                    "score_after": result_data["score_ats_despues"],
                    "keywords_added": result_data["keywords_agregadas"],
                    "keywords_missing": [
                        k
                        for k in result_data["keywords_oferta"]
                        if k not in result_data["keywords_agregadas"]
                        and k not in result_data["keywords_cv_original"]
                    ],
                    "optimized_sections": result_data["cv_optimizado"],
                    "suggestions": result_data["top_mejoras"],
                },
            })

        elif event["type"] == "error":
            yield _format_sse({"type": "error", "error": event["message"]})


def _format_sse(data: dict) -> str:
    """Format data as SSE event."""
    return f"data: {json.dumps(data)}\n\n"


@router.post("")
async def analyze_endpoint(
    user: AuthenticatedUser,
    cv: Annotated[UploadFile, File(description="CV PDF file")],
    job_description: Annotated[str, Form(description="Job description text")],
    cargo: Annotated[str | None, Form(description="Job title (optional)")] = None,
    empresa: Annotated[str | None, Form(description="Company name (optional)")] = None,
) -> StreamingResponse:
    """Analyze a CV against a job description.

    Accepts a PDF file and job description, returns SSE stream with
    progress updates and final optimization result.

    The response is a Server-Sent Events stream with the following event types:
    - progress: {"type": "progress", "stage": str, "progress": int}
    - result: {"type": "result", "id": str, "result": AnalysisResult}
    - error: {"type": "error", "error": str}
    """
    # Validate file type
    if cv.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se aceptan archivos PDF",
        )

    # Validate job description
    if not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ingresá la descripción del puesto",
        )

    if len(job_description.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Descripción muy corta (mín 50 caracteres)",
        )

    if len(job_description) > MAX_JD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Descripción muy larga",
        )

    # Read and validate PDF
    try:
        content = await cv.read()

        # Check size before processing
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Archivo muy grande (máx 5MB)",
            )

        # Extract text
        extraction = extract_text_from_pdf(content, cv.filename or "cv.pdf")

    except PDFExtractionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )

    # Generate optimization ID
    optimization_id = str(uuid.uuid4())

    # Return SSE stream
    return StreamingResponse(
        sse_generator(
            cv_text=extraction.text,
            job_description=job_description,
            optimization_id=optimization_id,
            user_id=user.id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
