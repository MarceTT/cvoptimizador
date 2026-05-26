"""LLM service supporting multiple providers (NVIDIA, Anthropic).

Abstracts the LLM provider so we can easily switch between providers.
"""

import json
import os
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from typing import Literal

import httpx

# Provider configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "nvidia")  # "nvidia" or "anthropic"

# NVIDIA configuration
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")

# Anthropic configuration
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

# Common settings
LLM_TIMEOUT = 90.0  # seconds
MAX_RETRIES = 1


class LLMError(Exception):
    """Custom exception for LLM API errors."""

    def __init__(self, message: str, code: str, retryable: bool = False):
        self.message = message
        self.code = code
        self.retryable = retryable
        super().__init__(message)


@dataclass
class AnalysisResult:
    """Result of CV analysis."""

    cv_optimizado: dict[str, str]
    keywords_oferta: list[str]
    keywords_cv_original: list[str]
    keywords_agregadas: list[str]
    score_ats_antes: int
    score_ats_despues: int
    top_mejoras: list[str]


ANALYSIS_PROMPT = """Sos un experto en optimización de CVs para sistemas ATS (Applicant Tracking Systems).
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
- Respondé SOLO con JSON válido, sin markdown, sin explicaciones adicionales

CV ORIGINAL:
{cv_text}

DESCRIPCIÓN DEL PUESTO:
{job_description}

{cargo_empresa}

Respondé ÚNICAMENTE con este JSON (sin ```json, sin texto antes o después):
{{
  "cv_optimizado": {{
    "summary": "Resumen profesional optimizado en español",
    "experience": "Experiencia laboral optimizada en español",
    "skills": "Habilidades optimizadas en español"
  }},
  "keywords_oferta": ["keyword1", "keyword2"],
  "keywords_cv_original": ["keyword1", "keyword2"],
  "keywords_agregadas": ["keyword1", "keyword2"],
  "score_ats_antes": 45,
  "score_ats_despues": 82,
  "top_mejoras": [
    "Explicación de mejora 1",
    "Explicación de mejora 2",
    "Explicación de mejora 3"
  ]
}}"""


async def _call_nvidia(prompt: str) -> str:
    """Call NVIDIA API."""
    if not NVIDIA_API_KEY:
        raise LLMError("NVIDIA_API_KEY not configured", "config_error")

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Sos un experto en recursos humanos y sistemas ATS. Siempre respondés en JSON válido sin markdown.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 4000,
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        try:
            response = await client.post(NVIDIA_API_URL, headers=headers, json=payload)

            if response.status_code == 429:
                raise LLMError("Rate limit exceeded", "rate_limit", retryable=True)

            if response.status_code >= 500:
                raise LLMError(
                    f"Server error: {response.status_code}", "server_error", retryable=True
                )

            if response.status_code != 200:
                raise LLMError(
                    f"API error: {response.status_code} - {response.text}",
                    "api_error",
                )

            data = response.json()
            return data["choices"][0]["message"]["content"]

        except httpx.TimeoutException:
            raise LLMError("Request timeout", "timeout", retryable=True)
        except httpx.RequestError as e:
            raise LLMError(f"Request failed: {e}", "request_error", retryable=True)


async def _call_anthropic(prompt: str) -> str:
    """Call Anthropic Claude API."""
    if not ANTHROPIC_API_KEY:
        raise LLMError("ANTHROPIC_API_KEY not configured", "config_error")

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }

    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        try:
            response = await client.post(ANTHROPIC_API_URL, headers=headers, json=payload)

            if response.status_code == 429:
                raise LLMError("Rate limit exceeded", "rate_limit", retryable=True)

            if response.status_code >= 500:
                raise LLMError(
                    f"Server error: {response.status_code}", "server_error", retryable=True
                )

            if response.status_code != 200:
                raise LLMError(
                    f"API error: {response.status_code} - {response.text}",
                    "api_error",
                )

            data = response.json()
            return data["content"][0]["text"]

        except httpx.TimeoutException:
            raise LLMError("Request timeout", "timeout", retryable=True)
        except httpx.RequestError as e:
            raise LLMError(f"Request failed: {e}", "request_error", retryable=True)


async def call_llm(prompt: str) -> str:
    """Call the configured LLM provider."""
    if LLM_PROVIDER == "nvidia":
        return await _call_nvidia(prompt)
    elif LLM_PROVIDER == "anthropic":
        return await _call_anthropic(prompt)
    else:
        raise LLMError(f"Unknown provider: {LLM_PROVIDER}", "config_error")


def _parse_json_response(content: str) -> dict:
    """Parse JSON from LLM response, handling common issues."""
    # Remove markdown code blocks if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        # Try to find JSON in the response
        import re

        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        raise LLMError(f"Invalid JSON response: {e}", "parse_error")


async def analyze_cv(
    cv_text: str,
    job_description: str,
    cargo: str | None = None,
    empresa: str | None = None,
) -> AnalysisResult:
    """Analyze and optimize a CV against a job description."""
    cargo_empresa = ""
    if cargo:
        cargo_empresa += f"CARGO: {cargo}\n"
    if empresa:
        cargo_empresa += f"EMPRESA: {empresa}\n"

    prompt = ANALYSIS_PROMPT.format(
        cv_text=cv_text,
        job_description=job_description,
        cargo_empresa=cargo_empresa,
    )

    # Call LLM with retry
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await call_llm(prompt)
            data = _parse_json_response(response)

            return AnalysisResult(
                cv_optimizado=data.get("cv_optimizado", {}),
                keywords_oferta=data.get("keywords_oferta", []),
                keywords_cv_original=data.get("keywords_cv_original", []),
                keywords_agregadas=data.get("keywords_agregadas", []),
                score_ats_antes=data.get("score_ats_antes", 0),
                score_ats_despues=data.get("score_ats_despues", 0),
                top_mejoras=data.get("top_mejoras", []),
            )
        except LLMError as e:
            last_error = e
            if not e.retryable or attempt >= MAX_RETRIES:
                raise

    raise last_error or LLMError("Unknown error", "unknown")


async def analyze_cv_streaming(
    cv_text: str,
    job_description: str,
    cargo: str | None = None,
    empresa: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Analyze CV with progress updates via SSE."""
    # Stage 1: Extracting
    yield {"type": "progress", "stage": "extracting", "progress": 10}

    # Stage 2: Analyzing
    yield {"type": "progress", "stage": "analyzing", "progress": 30}

    try:
        # Stage 3: Optimizing (actual LLM call)
        yield {"type": "progress", "stage": "optimizing", "progress": 50}

        result = await analyze_cv(cv_text, job_description, cargo, empresa)

        # Stage 4: Scoring
        yield {"type": "progress", "stage": "scoring", "progress": 90}

        # Final result
        yield {
            "type": "result",
            "data": {
                "cv_optimizado": result.cv_optimizado,
                "keywords_oferta": result.keywords_oferta,
                "keywords_cv_original": result.keywords_cv_original,
                "keywords_agregadas": result.keywords_agregadas,
                "score_ats_antes": result.score_ats_antes,
                "score_ats_despues": result.score_ats_despues,
                "top_mejoras": result.top_mejoras,
            },
        }

    except LLMError as e:
        yield {"type": "error", "error": e.message, "code": e.code}
