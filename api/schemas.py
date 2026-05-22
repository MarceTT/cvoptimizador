"""Pydantic models for API requests and responses."""

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request model for CV analysis."""

    cv_text: str = Field(min_length=200, description="Extracted text from CV PDF")
    job_description: str = Field(min_length=50, description="Job description text")
    cargo: str | None = Field(default=None, description="Job title (optional)")
    empresa: str | None = Field(default=None, description="Company name (optional)")


class OptimizedSections(BaseModel):
    """Optimized CV sections."""

    summary: str = Field(description="Optimized professional summary")
    experience: str = Field(description="Optimized work experience")
    skills: str = Field(description="Optimized skills section")


class AnalysisResult(BaseModel):
    """Result of CV analysis and optimization."""

    cv_optimizado: OptimizedSections = Field(description="Optimized CV sections")
    keywords_oferta: list[str] = Field(description="Keywords from job description")
    keywords_cv_original: list[str] = Field(description="Keywords already in CV")
    keywords_agregadas: list[str] = Field(description="Keywords added to CV")
    score_ats_antes: int = Field(ge=0, le=100, description="ATS score before optimization")
    score_ats_despues: int = Field(ge=0, le=100, description="ATS score after optimization")
    top_mejoras: list[str] = Field(description="Top 3 improvements made")


class SSEProgressEvent(BaseModel):
    """SSE progress event."""

    type: str = "progress"
    stage: str = Field(description="Current processing stage")
    progress: int = Field(ge=0, le=100, description="Progress percentage")


class SSEResultEvent(BaseModel):
    """SSE result event."""

    type: str = "result"
    id: str = Field(description="Optimization ID")
    result: AnalysisResult = Field(description="Analysis result")


class SSEErrorEvent(BaseModel):
    """SSE error event."""

    type: str = "error"
    error: str = Field(description="Error message")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
