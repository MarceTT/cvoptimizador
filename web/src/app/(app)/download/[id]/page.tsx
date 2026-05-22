"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Lock,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

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

  useEffect(() => {
    async function fetchDownloadUrl() {
      try {
        const trialParam = isTrial ? "?trial=true" : "";
        const response = await fetch(`/api/download/${id}${trialParam}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            setState({
              status: data.error === "Pago requerido" ? "unauthorized" : "error",
              downloadUrl: null,
              error: data.error,
            });
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
          downloadUrl: data.download_url,
          error: null,
        });
      } catch {
        setState({
          status: "error",
          downloadUrl: null,
          error: "Error de conexión",
        });
      }
    }

    fetchDownloadUrl();
  }, [id, isTrial]);

  const handleDownload = async () => {
    if (!state.downloadUrl) return;

    setState((prev) => ({ ...prev, status: "downloading" }));

    try {
      const response = await fetch(state.downloadUrl);
      if (!response.ok) throw new Error("Error al descargar");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv-optimizado-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setState((prev) => ({ ...prev, status: "ready" }));
    } catch {
      setState({
        status: "error",
        downloadUrl: state.downloadUrl,
        error: "Error al descargar el archivo",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-12">
        <StatusContent 
          status={state.status} 
          error={state.error}
          isTrial={isTrial}
          id={id}
          onDownload={handleDownload}
        />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">CVOptimizador</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/upload">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nuevo análisis
          </Link>
        </Button>
      </div>
    </header>
  );
}

interface StatusContentProps {
  status: DownloadStatus;
  error: string | null;
  isTrial: boolean;
  id: string;
  onDownload: () => void;
}

function StatusContent({ status, error, isTrial, id, onDownload }: StatusContentProps) {
  if (status === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 font-medium">Preparando tu descarga...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo un momento
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "ready" || status === "downloading") {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-accent/10 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <Badge variant="success" className="mt-4">
              {isTrial ? "Prueba gratuita" : "Pago confirmado"}
            </Badge>
            <h1 className="mt-4 text-2xl font-bold">¡Tu CV está listo!</h1>
            <p className="mt-2 text-muted-foreground">
              CV optimizado para pasar filtros ATS
            </p>
          </div>
        </div>
        <CardContent className="flex flex-col items-center py-8">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">cv-optimizado-{id.slice(0, 8)}.pdf</p>
              <p className="text-sm text-muted-foreground">PDF • Listo para enviar</p>
            </div>
          </div>
          <Button
            size="xl"
            className="mt-6 w-full"
            onClick={onDownload}
            disabled={status === "downloading"}
          >
            {status === "downloading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </>
            )}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Tu CV fue optimizado con IA para maximizar tu puntaje ATS
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "unauthorized") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Lock className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="mt-6 text-xl font-bold">Pago requerido</h1>
          <p className="mt-2 text-center text-muted-foreground">
            Necesitás completar el pago para descargar tu CV optimizado.
          </p>
          <Button className="mt-6" asChild>
            <Link href={`/results/${id}`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Ver resultados y pagar
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "expired") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-xl font-bold">Enlace expirado</h1>
          <p className="mt-2 text-center text-muted-foreground">
            Este enlace de descarga ya no está disponible.
            Los enlaces expiran después de 7 días.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/upload">
              <RefreshCw className="mr-2 h-4 w-4" />
              Analizar otro CV
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error state
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="mt-6 text-xl font-bold">Error</h1>
        <p className="mt-2 text-center text-muted-foreground">
          {error || "Ocurrió un error al preparar la descarga."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
          <Button asChild>
            <Link href="/upload">Nuevo análisis</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
