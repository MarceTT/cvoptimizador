/**
 * CV optimization analysis result from Claude
 */
export interface AnalysisResult {
  /** ATS score before optimization (0-100) */
  score_before: number;
  /** ATS score after optimization (0-100) */
  score_after: number;
  /** Keywords successfully added to CV */
  keywords_added: string[];
  /** Keywords missing from the CV */
  keywords_missing: string[];
  /** Optimized content sections */
  optimized_sections: {
    experience: string;
    skills: string;
    summary: string;
  };
  /** Additional improvement suggestions */
  suggestions: string[];
}

/**
 * SSE event types for streaming analysis progress
 */
export type SSEEventType = "progress" | "result" | "error";

/**
 * Analysis progress stages
 */
export type AnalysisStage =
  | "extracting"
  | "analyzing"
  | "optimizing"
  | "scoring";

/**
 * SSE event payload for analysis streaming
 */
export interface SSEEvent {
  type: SSEEventType;
  data: {
    /** Current processing stage */
    stage?: AnalysisStage;
    /** Progress percentage (0-100) */
    progress?: number;
    /** Final analysis result (when type is 'result') */
    result?: AnalysisResult;
    /** Error message (when type is 'error') */
    error?: string;
  };
}

/**
 * Optimization record status
 */
export type OptimizationStatus =
  | "pending"
  | "analyzing"
  | "completed"
  | "failed";

/**
 * Optimization database record
 */
export interface Optimization {
  id: string;
  user_id: string;
  original_cv_text: string;
  job_description: string;
  optimized_cv_json: AnalysisResult | null;
  score_before: number | null;
  score_after: number | null;
  keywords_added: string[] | null;
  pdf_storage_path: string | null;
  status: OptimizationStatus;
  created_at: string;
  expires_at: string;
}
