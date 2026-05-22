"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { KeywordList } from "@/components/KeywordList";
import { PaymentButton } from "@/components/PaymentButton";
import { cn } from "@/lib/utils";

// This would come from API/database in real implementation
// For now we'll use mock data passed via session storage
interface ResultData {
  id: string;
  scoreBefore: number;
  scoreAfter: number;
  keywordsAdded: string[];
  keywordsMissing: string[];
  suggestions: string[];
  isPaid?: boolean;
  isTrialEligible?: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

type PaymentStatus = "idle" | "cancelled" | "failed" | "error" | "authorized";

export default function ResultsPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");

  // Check URL params for payment status (from WebPay callback)
  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (paymentParam) {
      setPaymentStatus(paymentParam as PaymentStatus);
    }
  }, [searchParams]);

  // In a real app, this would fetch from the database
  // For MVP demo, we use session storage or mock data
  const result = getResultData(id);

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-4xl items-center px-4 py-4">
            <Link href="/" className="text-xl font-bold text-primary">
              CVOptimizador
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Resultado no encontrado</h1>
          <p className="mt-4 text-muted-foreground">
            El análisis que buscás no existe o ya expiró.
          </p>
          <Link
            href="/upload"
            className={cn(
              "mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors"
            )}
          >
            Analizar otro CV
          </Link>
        </main>
      </div>
    );
  }

  // Check if this is a free trial (first optimization)
  const showTrialBanner = result.isTrialEligible && !result.isPaid;

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

      <main className="mx-auto max-w-3xl px-4 py-12">
        {/* Payment Status Banner */}
        <PaymentStatusBanner status={paymentStatus} />

        {/* Success Banner */}
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-green-800">
              ¡Análisis completado!
            </span>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold">Resultados del Análisis</h1>
        <p className="mt-2 text-muted-foreground">
          Así mejoró tu CV con nuestra optimización ATS
        </p>

        {/* Score Display */}
        <ScoreDisplay
          scoreBefore={result.scoreBefore}
          scoreAfter={result.scoreAfter}
          className="mt-8"
        />

        {/* Keywords */}
        <KeywordList
          keywordsAdded={result.keywordsAdded}
          keywordsMissing={result.keywordsMissing}
          className="mt-6"
        />

        {/* Top Improvements */}
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Mejoras Principales</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Los cambios más importantes que hicimos a tu CV
          </p>
          <ul className="mt-4 space-y-3">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span className="text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA - Payment or Download */}
        <div className="mt-8 rounded-lg border-2 border-primary bg-primary/5 p-6 text-center">
          {result.isPaid ? (
            // Already paid - show download
            <>
              <h3 className="text-xl font-bold">
                ¡Tu CV optimizado está listo!
              </h3>
              <p className="mt-2 text-muted-foreground">
                Descargá tu PDF con todas las optimizaciones aplicadas
              </p>
              <Link
                href={`/download/${id}`}
                className={cn(
                  "mt-6 inline-block rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground",
                  "hover:bg-primary/90 transition-colors"
                )}
              >
                Descargar CV optimizado
              </Link>
            </>
          ) : showTrialBanner ? (
            // Free trial - direct download
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <GiftIcon className="h-4 w-4" />
                ¡Prueba gratuita!
              </div>
              <h3 className="text-xl font-bold">
                Tu primera optimización es gratis
              </h3>
              <p className="mt-2 text-muted-foreground">
                Descargá tu CV optimizado sin costo
              </p>
              <Link
                href={`/download/${id}?trial=true`}
                className={cn(
                  "mt-6 inline-block rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground",
                  "hover:bg-primary/90 transition-colors"
                )}
              >
                Descargar gratis
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Las próximas optimizaciones tienen un costo de $2.990
              </p>
            </>
          ) : (
            // Need payment
            <>
              <h3 className="text-xl font-bold">
                ¿Querés descargar tu CV optimizado?
              </h3>
              <p className="mt-2 text-muted-foreground">
                Obtené el PDF con todas las optimizaciones aplicadas
              </p>
              <div className="mt-6">
                <PaymentButton
                  optimizationId={id}
                  isPaid={result.isPaid}
                  onPaymentComplete={() => setPaymentStatus("authorized")}
                  onPaymentError={() => setPaymentStatus("error")}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Pago seguro con WebPay. Tu CV estará disponible por 7 días.
              </p>
            </>
          )}
        </div>

        {/* Try Again */}
        <div className="mt-8 text-center">
          <Link
            href="/upload"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ¿Querés optimizar para otro puesto? →
          </Link>
        </div>
      </main>
    </div>
  );
}

/**
 * Banner showing payment status from WebPay callback
 */
function PaymentStatusBanner({ status }: { status: PaymentStatus }) {
  if (status === "idle") return null;

  const configs = {
    cancelled: {
      bg: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-800",
      message: "Pago cancelado. Podés intentar de nuevo cuando quieras.",
    },
    failed: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      message: "El pago no se completó. Podés intentar con otro medio de pago.",
    },
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      message: "Ocurrió un error. Si el cobro se realizó, contactanos.",
    },
    authorized: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-800",
      message: "¡Pago exitoso! Ya podés descargar tu CV.",
    },
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <div className={cn("mb-6 rounded-lg border px-4 py-3", config.bg)}>
      <p className={cn("text-sm font-medium", config.text)}>{config.message}</p>
    </div>
  );
}

function GiftIcon({ className }: { className?: string }) {
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
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    </svg>
  );
}

function getResultData(id: string): ResultData | null {
  // In real implementation, this would be fetched from database
  // For MVP demo, we try to get from sessionStorage or return mock data

  if (typeof window === "undefined") {
    return null;
  }

  // Try session storage first
  try {
    const stored = sessionStorage.getItem(`result-${id}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore storage errors
  }

  // Return mock data for demo purposes
  // In production, this would return null if not found in DB
  return {
    id,
    scoreBefore: 42,
    scoreAfter: 78,
    keywordsAdded: [
      "React",
      "TypeScript",
      "Node.js",
      "API REST",
      "Git",
      "CI/CD",
      "Testing",
    ],
    keywordsMissing: ["GraphQL", "AWS", "Docker"],
    suggestions: [
      "Agregamos keywords técnicas específicas del puesto en tu resumen profesional",
      "Reformulamos tu experiencia laboral destacando logros cuantificables",
      "Optimizamos la sección de habilidades con las tecnologías que buscan",
    ],
    isPaid: false,
    isTrialEligible: false, // Would be set based on user.trial_used_at
  };
}
