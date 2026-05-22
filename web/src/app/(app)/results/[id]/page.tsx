"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { KeywordComparison } from "@/components/KeywordList";
import { PaymentButton } from "@/components/PaymentButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Lightbulb,
  Sparkles,
  Download,
  RefreshCw
} from "lucide-react";

interface ResultData {
  id: string;
  scoreBefore: number;
  scoreAfter: number;
  keywordsAdded: string[];
  keywordsExisting: string[];
  keywordsMissing: string[];
  suggestions: string[];
  isPaid?: boolean;
  isTrialEligible?: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

type PaymentStatus = "idle" | "loading" | "redirecting" | "cancelled" | "failed" | "error" | "authorized";

export default function ResultsPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");

  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (paymentParam) {
      setPaymentStatus(paymentParam as PaymentStatus);
    }
  }, [searchParams]);

  const result = getResultData(id);

  if (!result) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="mt-6 text-2xl font-bold">Resultado no encontrado</h1>
              <p className="mt-2 text-muted-foreground">
                El análisis que buscás no existe o ya expiró.
              </p>
              <Button className="mt-8" asChild>
                <Link href="/upload">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Analizar otro CV
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const showTrialBanner = result.isTrialEligible && !result.isPaid;
  const isPaid = result.isPaid || paymentStatus === "authorized";

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Payment Status Banner */}
        <PaymentStatusBanner status={paymentStatus} />

        {/* Trial Banner */}
        {showTrialBanner && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/50">
            <Sparkles className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                ¡Tu primer análisis es gratis!
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Podés descargar este CV optimizado sin costo.
              </p>
            </div>
          </div>
        )}

        {/* Score Section */}
        <Card>
          <CardHeader className="text-center">
            <Badge variant="secondary" className="mx-auto mb-2 w-fit">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Análisis completado
            </Badge>
            <CardTitle className="text-2xl">Puntaje ATS</CardTitle>
            <CardDescription>
              Comparación de tu CV original vs optimizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreDisplay
              scoreBefore={result.scoreBefore}
              scoreAfter={result.scoreAfter}
            />
          </CardContent>
        </Card>

        {/* Keywords Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Palabras clave
            </CardTitle>
            <CardDescription>
              Keywords detectadas en la oferta laboral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeywordComparison
              keywordsAdded={result.keywordsAdded}
              keywordsExisting={result.keywordsExisting}
              keywordsMissing={result.keywordsMissing}
            />
          </CardContent>
        </Card>

        {/* Suggestions Section */}
        {result.suggestions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Mejoras realizadas
              </CardTitle>
              <CardDescription>
                Los cambios que hicimos para optimizar tu CV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span className="text-sm">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Download Section */}
        <Card className="mt-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6">
            <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {isPaid ? "Tu CV está listo" : "Descargá tu CV optimizado"}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {isPaid 
                    ? "Hacé clic para descargar tu CV en PDF." 
                    : showTrialBanner
                    ? "¡Gratis por ser tu primera optimización!"
                    : "PDF profesional listo para enviar por $2.990 CLP."}
                </p>
              </div>
              <div className="mt-4 sm:ml-6 sm:mt-0">
                {isPaid ? (
                  <Button size="lg" asChild>
                    <Link href={`/download/${id}`}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </Link>
                  </Button>
                ) : showTrialBanner ? (
                  <Button size="lg" asChild>
                    <Link href={`/download/${id}`}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar gratis
                    </Link>
                  </Button>
                ) : (
                  <PaymentButton 
                    optimizationId={id} 
                    amount={2990}
                    onStatusChange={setPaymentStatus}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* New Analysis CTA */}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/upload">
              <RefreshCw className="mr-2 h-4 w-4" />
              Analizar otro CV
            </Link>
          </Button>
        </div>
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

function PaymentStatusBanner({ status }: { status: PaymentStatus }) {
  if (status === "idle" || status === "loading" || status === "redirecting") return null;

  const config = {
    authorized: {
      icon: CheckCircle2,
      title: "¡Pago exitoso!",
      description: "Tu CV optimizado está listo para descargar.",
      className: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50",
      iconColor: "text-green-600",
      textColor: "text-green-800 dark:text-green-200",
      descColor: "text-green-700 dark:text-green-300",
    },
    cancelled: {
      icon: XCircle,
      title: "Pago cancelado",
      description: "Podés intentar de nuevo cuando quieras.",
      className: "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50",
      iconColor: "text-yellow-600",
      textColor: "text-yellow-800 dark:text-yellow-200",
      descColor: "text-yellow-700 dark:text-yellow-300",
    },
    failed: {
      icon: AlertCircle,
      title: "Error en el pago",
      description: "Hubo un problema con tu pago. Intentá de nuevo.",
      className: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50",
      iconColor: "text-red-600",
      textColor: "text-red-800 dark:text-red-200",
      descColor: "text-red-700 dark:text-red-300",
    },
    error: {
      icon: AlertCircle,
      title: "Error",
      description: "Ocurrió un error inesperado. Intentá de nuevo.",
      className: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50",
      iconColor: "text-red-600",
      textColor: "text-red-800 dark:text-red-200",
      descColor: "text-red-700 dark:text-red-300",
    },
  };

  const { icon: Icon, title, description, className, iconColor, textColor, descColor } = config[status];

  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${className}`}>
      <Icon className={`mt-0.5 h-5 w-5 ${iconColor}`} />
      <div>
        <p className={`font-medium ${textColor}`}>{title}</p>
        <p className={`mt-1 text-sm ${descColor}`}>{description}</p>
      </div>
    </div>
  );
}

// Mock data function - in production this would fetch from API
function getResultData(id: string): ResultData | null {
  // Try session storage first (from recent analysis)
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(`result-${id}`);
    if (stored) {
      return JSON.parse(stored);
    }
  }

  // For demo purposes, return mock data
  // In production, this would call the API
  if (id === "demo" || id.length > 5) {
    return {
      id,
      scoreBefore: 42,
      scoreAfter: 78,
      keywordsAdded: [
        "metodología ágil",
        "Scrum",
        "liderazgo",
        "Python",
        "SQL",
      ],
      keywordsExisting: [
        "gestión de proyectos",
        "trabajo en equipo",
        "comunicación",
      ],
      keywordsMissing: [
        "Kubernetes",
        "AWS",
      ],
      suggestions: [
        "Se reemplazó 'gestión de equipos' por 'liderazgo de equipos multidisciplinarios' que aparece 3 veces en la oferta",
        "Se movió la sección de habilidades técnicas al inicio para destacar Python y SQL que son requisitos excluyentes",
        "Se agregó 'metodología ágil' y 'Scrum' que aparecen en la oferta y coinciden con tu experiencia en proyectos iterativos",
      ],
      isPaid: false,
      isTrialEligible: true,
    };
  }

  return null;
}
