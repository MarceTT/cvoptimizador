"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

type DownloadStatus =
  | "loading"
  | "ready"
  | "downloading"
  | "error"
  | "expired"
  | "unauthorized";

interface DownloadState {
  status: DownloadStatus;
  downloadUrl: string | null;
  error: string | null;
}

export default function DownloadPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isTrial = searchParams.get("trial") === "true";

  const [state, setState] = useState<DownloadState>({
    status: "loading",
    downloadUrl: null,
    error: null,
  });

  // Fetch download URL on mount
  useEffect(() => {
    async function fetchDownloadUrl() {
      try {
        const trialParam = isTrial ? "?trial=true" : "";
        const response = await fetch(`/api/download/${id}${trialParam}`);
        const data = await response.json();

        if (!response.ok) {
          // Handle specific error codes
          if (response.status === 403) {
            if (data.error === "Pago requerido") {
              setState({
                status: "unauthorized",
                downloadUrl: null,
                error: data.error,
              });
            } else {
              setState({
                status: "error",
                downloadUrl: null,
                error: data.error || "Token inválido",
              });
            }
            return;
          }

          if (response.status === 410) {
            setState({
              status: "expired",
              downloadUrl: null,
              error: data.error,
            });
            return;
          }

          setState({
            status: "error",
            downloadUrl: null,
            error: data.error || "Error al obtener descarga",
          });
          return;
        }

        setState({
          status: "ready",
          downloadUrl: data.downloadUrl,
          error: null,
        });
      } catch {
        setState({
          status: "error",
          downloadUrl: null,
          error: "Error de conexión. Intentá de nuevo.",
        });
      }
    }

    fetchDownloadUrl();
  }, [id, isTrial]);

  // Handle download click
  const handleDownload = () => {
    if (!state.downloadUrl) return;

    setState((prev) => ({ ...prev, status: "downloading" }));

    // Open download URL in new tab/trigger download
    window.open(state.downloadUrl, "_blank");

    // Reset to ready state after a brief delay
    setTimeout(() => {
      setState((prev) => ({ ...prev, status: "ready" }));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            CVOptimizador
          </Link>
          <Link
            href="/upload"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Nuevo análisis
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Loading State */}
        {state.status === "loading" && (
          <div className="text-center">
            <LoadingSpinner className="mx-auto h-12 w-12" />
            <h1 className="mt-6 text-2xl font-bold">Preparando tu descarga...</h1>
            <p className="mt-2 text-muted-foreground">
              Estamos generando tu CV optimizado
            </p>
          </div>
        )}

        {/* Ready State */}
        {state.status === "ready" && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">¡Tu CV está listo!</h1>
            <p className="mt-2 text-muted-foreground">
              {isTrial
                ? "Tu prueba gratuita ha sido procesada"
                : "Tu pago fue confirmado exitosamente"}
            </p>

            <button
              onClick={handleDownload}
              className={cn(
                "mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-medium text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              <DownloadIcon className="h-5 w-5" />
              Descargar CV optimizado
            </button>

            <div className="mt-8 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                El enlace de descarga estará disponible por <strong>7 días</strong>.
                Guardá el archivo en un lugar seguro.
              </p>
            </div>
          </div>
        )}

        {/* Downloading State */}
        {state.status === "downloading" && (
          <div className="text-center">
            <LoadingSpinner className="mx-auto h-12 w-12" />
            <h1 className="mt-6 text-2xl font-bold">Descargando...</h1>
            <p className="mt-2 text-muted-foreground">
              Tu archivo se está descargando
            </p>
          </div>
        )}

        {/* Expired State */}
        {state.status === "expired" && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Enlace expirado</h1>
            <p className="mt-2 text-muted-foreground">
              Este enlace de descarga ya no está disponible.
              Los CVs optimizados expiran después de 7 días.
            </p>
            <Link
              href="/upload"
              className={cn(
                "mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Crear nueva optimización
            </Link>
          </div>
        )}

        {/* Unauthorized State */}
        {state.status === "unauthorized" && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <LockIcon className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Pago requerido</h1>
            <p className="mt-2 text-muted-foreground">
              Necesitás completar el pago para descargar tu CV optimizado.
            </p>
            <Link
              href={`/results/${id}`}
              className={cn(
                "mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground",
                "hover:bg-primary/90 transition-colors"
              )}
            >
              Volver a resultados
            </Link>
          </div>
        )}

        {/* Error State */}
        {state.status === "error" && (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XIcon className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Error</h1>
            <p className="mt-2 text-muted-foreground">
              {state.error || "Ocurrió un error al procesar tu descarga."}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "rounded-lg border border-border px-6 py-3 font-medium",
                  "hover:bg-muted transition-colors"
                )}
              >
                Reintentar
              </button>
              <Link
                href={`/results/${id}`}
                className={cn(
                  "rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground",
                  "hover:bg-primary/90 transition-colors"
                )}
              >
                Volver a resultados
              </Link>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Problemas con la descarga?{" "}
            <a
              href="mailto:soporte@cvoptimizador.cl"
              className="text-primary hover:underline"
            >
              Contactanos
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

// Icon Components

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin text-primary", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
