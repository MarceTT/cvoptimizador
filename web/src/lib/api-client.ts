import type { AnalysisResult, SSEEvent } from "@cvoptimizador/types";

interface AnalyzeOptions {
  cargo?: string;
  empresa?: string;
}

interface AnalyzeResponse {
  id: string;
  result: AnalysisResult;
}

type ProgressCallback = (data: { stage?: string; progress?: number }) => void;

/**
 * Analyze a CV against a job description using SSE streaming
 */
export async function analyzeCV(
  file: File,
  jobDescription: string,
  options: AnalyzeOptions = {},
  onProgress?: ProgressCallback
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("cv", file);
  formData.append("job_description", jobDescription);
  if (options.cargo) formData.append("cargo", options.cargo);
  if (options.empresa) formData.append("empresa", options.empresa);

  const response = await fetch("/api/optimize", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? `Error ${response.status}`);
  }

  // Handle SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: AnalyzeResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as SSEEvent;

            switch (event.type) {
              case "progress":
                onProgress?.({
                  stage: event.data.stage,
                  progress: event.data.progress,
                });
                break;

              case "result":
                if (event.data.result) {
                  result = {
                    id: (event.data as { id?: string }).id ?? crypto.randomUUID(),
                    result: event.data.result,
                  };
                }
                break;

              case "error":
                throw new Error(event.data.error ?? "Error de análisis");
            }
          } catch (parseError) {
            // Skip malformed JSON lines
            console.warn("Failed to parse SSE event:", parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new Error("No se recibió resultado del análisis");
  }

  return result;
}

/**
 * Create a payment for an optimization
 */
export async function createPayment(optimizationId: string): Promise<{ redirectUrl: string }> {
  const response = await fetch("/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optimization_id: optimizationId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? `Error ${response.status}`);
  }

  return response.json();
}

/**
 * Get download URL for a paid optimization
 */
export async function getDownloadUrl(optimizationId: string): Promise<{ url: string }> {
  const response = await fetch(`/api/download/${optimizationId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? `Error ${response.status}`);
  }

  return response.json();
}
