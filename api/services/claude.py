"""Claude AI service for CV analysis and optimization.

Uses Claude Sonnet 4 for analyzing CVs against job descriptions and
generating optimized versions with ATS scoring.
"""

import json
import os
from collections.abc import AsyncGenerator
from dataclasses import dataclass

import httpx

# Claude API configuration
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-sonnet-4-20250514"
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_TIMEOUT = 60.0  # seconds
MAX_RETRIES = 1


class ClaudeAnalysisError(Exception):
    """Custom exception for Claude API errors."""

    def __init__(self, message: str, code: str, retryable: bool = False):
        self.message = message
        self.code = code
        self.retryable = retryable
        super().__init__(message)


@dataclass
class AnalysisResult:
    """Result of CV analysis."""

    cv_optimizado: dict[str, str]  # Optimized sections
    keywords_oferta: list[str]  # Keywords from job description
    keywords_cv_original: list[str]  # Keywords already in CV
    keywords_agregadas: list[str]  # Keywords added to CV
    score_ats_antes: int  # Score before optimization (0-100)
    score_ats_despues: int  # Score after optimization (0-100)
    top_mejoras: list[str]  # Top 3 improvement explanations


ANALYSIS_PROMPT = """Sos un experto en optimización de CVs para sistemas ATS.
Analizá el CV contra la descripción del puesto y optimizalo para maximizar el puntaje ATS.

INSTRUCCIONES:
1. Identificá todas las palabras clave relevantes de la descripción del puesto
2. Analizá qué keywords ya están en el CV original
3. Optimizá las secciones del CV incorporando las keywords faltantes de forma natural
4. Calculá un puntaje ATS antes y después de la optimización (0-100)
5. Explicá las 3 mejoras más importantes que hiciste

IMPORTANTE:
- Mantené el contenido verídico del CV original, solo optimizá la redacción
- Las keywords deben integrarse de forma natural, no forzada
- El puntaje ATS debe ser realista basado en la coincidencia de keywords y formato

CV ORIGINAL:
{cv_text}

DESCRIPCIÓN DEL PUESTO:
{job_description}

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{{
  "cv_optimizado": {{
    "summary": "Resumen profesional optimizado",
    "experience": "Experiencia laboral optimizada",
    "skills": "Habilidades optimizadas"
  }},
  "keywords_oferta": ["keyword1", "keyword2", ...],
  "keywords_cv_original": ["keyword1", "keyword2", ...],
  "keywords_agregadas": ["keyword1", "keyword2", ...],
  "score_ats_antes": 45,
  "score_ats_despues": 82,
  "top_mejoras": [
    "Explicación de mejora 1",
    "Explicación de mejora 2",
    "Explicación de mejora 3"
  ]
}}"""


async def analyze_cv(
    cv_text: str,
    job_description: str,
) -> AsyncGenerator[dict, None]:
    """Analyze a CV against a job description using Claude.

    Yields progress events and finally the result.

    Args:
        cv_text: Extracted text from the CV
        job_description: Job description text

    Yields:
        Progress events: {"type": "progress", "stage": str, "progress": int}
        Result event: {"type": "result", "data": AnalysisResult}
        Error event: {"type": "error", "message": str}
    """
    if not CLAUDE_API_KEY:
        yield {"type": "error", "message": "API key no configurada"}
        return

    # Validate content
    if len(cv_text.strip()) < 200:
        yield {"type": "error", "message": "CV sin contenido suficiente"}
        return

    yield {"type": "progress", "stage": "analyzing", "progress": 20}

    prompt = ANALYSIS_PROMPT.format(cv_text=cv_text, job_description=job_description)

    retries = 0
    last_error: Exception | None = None

    while retries <= MAX_RETRIES:
        try:
            yield {"type": "progress", "stage": "optimizing", "progress": 40 + (retries * 10)}

            result = await _call_claude(prompt)

            yield {"type": "progress", "stage": "scoring", "progress": 80}

            # Parse and validate the response
            analysis = _parse_response(result)

            yield {"type": "progress", "stage": "scoring", "progress": 100}
            yield {"type": "result", "data": analysis}
            return

        except ClaudeAnalysisError as e:
            last_error = e
            if e.retryable and retries < MAX_RETRIES:
                retries += 1
                continue
            yield {"type": "error", "message": e.message}
            return

        except Exception as e:
            last_error = e
            if retries < MAX_RETRIES:
                retries += 1
                continue
            yield {"type": "error", "message": "Error interno"}
            return

    # Should not reach here, but just in case
    yield {"type": "error", "message": str(last_error) if last_error else "Error desconocido"}


async def _call_claude(prompt: str) -> str:
    """Make a request to Claude API.

    Args:
        prompt: The prompt to send

    Returns:
        Claude's response text

    Raises:
        ClaudeAnalysisError: If the API call fails
    """
    headers = {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
    }

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=CLAUDE_TIMEOUT) as client:
        try:
            response = await client.post(CLAUDE_API_URL, headers=headers, json=payload)

            if response.status_code == 429:
                raise ClaudeAnalysisError(
                    "Muchas solicitudes, esperá un momento",
                    "rate_limited",
                    retryable=True,
                )

            if response.status_code >= 500:
                raise ClaudeAnalysisError(
                    "Error de análisis, reintentá",
                    "server_error",
                    retryable=True,
                )

            if response.status_code != 200:
                raise ClaudeAnalysisError(
                    f"Error de API: {response.status_code}",
                    "api_error",
                    retryable=False,
                )

            data = response.json()
            content = data.get("content", [])
            if not content or not content[0].get("text"):
                raise ClaudeAnalysisError(
                    "Respuesta vacía de Claude", "empty_response", retryable=True
                )

            return content[0]["text"]

        except httpx.TimeoutException:
            raise ClaudeAnalysisError(
                "Error de análisis, reintentá",
                "timeout",
                retryable=True,
            )
        except httpx.RequestError as e:
            raise ClaudeAnalysisError(
                f"Error de conexión: {e}",
                "connection_error",
                retryable=True,
            )


def _parse_response(response_text: str) -> dict:
    """Parse Claude's JSON response.

    Args:
        response_text: Raw response text from Claude

    Returns:
        Parsed analysis result

    Raises:
        ClaudeAnalysisError: If parsing fails
    """
    try:
        # Clean up the response (remove markdown code blocks if present)
        text = response_text.strip()
        if text.startswith("```"):
            # Find the first newline after ``` and the last ```
            first_newline = text.find("\n")
            last_backticks = text.rfind("```")
            if first_newline != -1 and last_backticks > first_newline:
                text = text[first_newline + 1 : last_backticks].strip()

        data = json.loads(text)

        # Validate required fields
        required_fields = [
            "cv_optimizado",
            "keywords_oferta",
            "keywords_cv_original",
            "keywords_agregadas",
            "score_ats_antes",
            "score_ats_despues",
            "top_mejoras",
        ]

        for field in required_fields:
            if field not in data:
                raise ClaudeAnalysisError(
                    "Respuesta incompleta de Claude",
                    "invalid_response",
                    retryable=True,
                )

        # Validate score ranges
        if not (0 <= data["score_ats_antes"] <= 100):
            data["score_ats_antes"] = max(0, min(100, data["score_ats_antes"]))
        if not (0 <= data["score_ats_despues"] <= 100):
            data["score_ats_despues"] = max(0, min(100, data["score_ats_despues"]))

        return data

    except json.JSONDecodeError:
        raise ClaudeAnalysisError(
            "Error interno",
            "json_parse_error",
            retryable=True,
        )
