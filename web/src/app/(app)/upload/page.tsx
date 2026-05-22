"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileUpload, type FileValidationError } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { analyzeCV } from "@/lib/api-client";
import { 
  FileText, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";

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
            analyzing: "Analizando tu CV con IA...",
            optimizing: "Optimizando contenido...",
            scoring: "Calculando puntajes ATS...",
          };
          setProgress({
            stage: stageLabels[progressData.stage ?? ""] ?? progressData.stage ?? "",
            progress: progressData.progress ?? 0,
          });
        }
      );

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
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CVOptimizador</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1.5 h-3 w-3" />
            Análisis gratuito
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Analizá tu CV</h1>
          <p className="mt-2 text-muted-foreground">
            Subí tu currículum y la descripción del puesto para obtener tu análisis ATS
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Información del análisis</CardTitle>
            <CardDescription>
              Completá los campos para analizar tu CV contra la oferta laboral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="cv-file">
                  Tu CV en PDF <span className="text-destructive">*</span>
                </Label>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  onError={handleFileError}
                  disabled={isSubmitting}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {file.name}
                  </div>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="job-description">
                  Descripción del puesto <span className="text-destructive">*</span>
                </Label>
                <Textarea
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
                    "resize-none",
                    !jdIsValid && jdLength > 0 && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <p className={cn(
                  "text-xs",
                  jdIsValid ? "text-muted-foreground" : jdLength > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {jdLength}/{MIN_JD_LENGTH} caracteres mínimos
                  {jdIsValid && <CheckCircle2 className="ml-1 inline h-3 w-3 text-accent" />}
                </p>
              </div>

              {/* Optional Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo (opcional)</Label>
                  <Input
                    id="cargo"
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="ej: Desarrollador Frontend"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa (opcional)</Label>
                  <Input
                    id="empresa"
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="ej: Mercado Libre"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Progress */}
              {progress && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      {progress.stage}
                    </span>
                    <span className="text-muted-foreground">{progress.progress}%</span>
                  </div>
                  <Progress value={progress.progress} className="mt-3 h-2" />
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="xl"
                disabled={isSubmitting || !file || !jdIsValid}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analizar CV
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">¿Primera vez?</p>
            <p className="mt-1 text-muted-foreground">
              Tu primer análisis es gratis. Solo pagás $2.990 CLP si querés descargar el CV optimizado.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
