"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileUpload, type FileValidationError } from "@/components/FileUpload";
import { cn } from "@/lib/utils";
import { analyzeCV } from "@/lib/api-client";

const MIN_JD_LENGTH = 50;

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number } | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleFileError = useCallback((err: FileValidationError) => {
    setError(err.message);
    setFile(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!file) {
      setError("Seleccioná un archivo PDF");
      return false;
    }

    if (!jobDescription.trim()) {
      setError("Ingresá la descripción del puesto");
      return false;
    }

    if (jobDescription.trim().length < MIN_JD_LENGTH) {
      setError(`Descripción muy corta (mín ${MIN_JD_LENGTH} caracteres)`);
      return false;
    }

    return true;
  }, [file, jobDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !file) return;

    setIsSubmitting(true);
    setError(null);
    setProgress({ stage: "Preparando...", progress: 0 });

    try {
      const result = await analyzeCV(
        file,
        jobDescription,
        { cargo, empresa },
        (progressData) => {
          const stageLabels: Record<string, string> = {
            extracting: "Extrayendo texto del PDF...",
            analyzing: "Analizando tu CV...",
            optimizing: "Optimizando contenido...",
            scoring: "Calculando puntajes...",
          };
          setProgress({
            stage: stageLabels[progressData.stage ?? ""] ?? progressData.stage ?? "",
            progress: progressData.progress ?? 0,
          });
        }
      );

      // Redirect to results page
      router.push(`/results/${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al analizar el CV";
      setError(message);
      setProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const jdLength = jobDescription.trim().length;
  const jdIsValid = jdLength >= MIN_JD_LENGTH;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            CVOptimizador
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">Analizá tu CV</h1>
        <p className="mt-2 text-muted-foreground">
          Subí tu currículum y la descripción del puesto para obtener tu análisis ATS
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium">
              Tu CV en PDF <span className="text-destructive">*</span>
            </label>
            <FileUpload
              onFileSelect={handleFileSelect}
              onError={handleFileError}
              disabled={isSubmitting}
              className="mt-2"
            />
          </div>

          {/* Job Description */}
          <div>
            <label htmlFor="job-description" className="block text-sm font-medium">
              Descripción del puesto <span className="text-destructive">*</span>
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setError(null);
              }}
              disabled={isSubmitting}
              placeholder="Pegá acá la descripción completa del puesto al que querés aplicar..."
              rows={8}
              className={cn(
                "mt-2 w-full rounded-lg border bg-background px-4 py-3 text-sm",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !jdIsValid && jdLength > 0 ? "border-destructive" : "border-input"
              )}
            />
            <p className={cn("mt-1 text-xs", jdIsValid ? "text-muted-foreground" : "text-destructive")}>
              {jdLength}/{MIN_JD_LENGTH} caracteres mínimos
            </p>
          </div>

          {/* Optional Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cargo" className="block text-sm font-medium">
                Cargo (opcional)
              </label>
              <input
                id="cargo"
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                disabled={isSubmitting}
                placeholder="ej: Desarrollador Frontend"
                className={cn(
                  "mt-2 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
            <div>
              <label htmlFor="empresa" className="block text-sm font-medium">
                Empresa (opcional)
              </label>
              <input
                id="empresa"
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                disabled={isSubmitting}
                placeholder="ej: Mercado Libre"
                className={cn(
                  "mt-2 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="rounded-lg bg-primary/5 px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{progress.stage}</span>
                <span className="text-muted-foreground">{progress.progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !file || !jdIsValid}
            className={cn(
              "w-full rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground",
              "transition-colors hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isSubmitting ? "Analizando..." : "Analizar CV"}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 rounded-lg border border-border bg-secondary/30 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">¿Primera vez?</strong> Tu primer análisis es
            gratis. Solo pagás $2.990 CLP si querés descargar el CV optimizado.
          </p>
        </div>
      </main>
    </div>
  );
}
