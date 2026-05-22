"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export type PaymentState =
  | "idle"
  | "loading"
  | "paid"
  | "cancelled"
  | "failed"
  | "error";

interface PaymentButtonProps {
  /** Optimization ID to pay for */
  optimizationId: string;
  /** Whether the user has already paid */
  isPaid?: boolean;
  /** Price to display (default: $2.990) */
  price?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when payment starts */
  onPaymentStart?: () => void;
  /** Callback when payment is complete */
  onPaymentComplete?: () => void;
  /** Callback when payment fails */
  onPaymentError?: (error: string) => void;
}

/**
 * WebPay payment button with loading states and error handling.
 * Handles redirect to WebPay and manages button state.
 */
export function PaymentButton({
  optimizationId,
  isPaid = false,
  price = "$2.990",
  className,
  onPaymentStart,
  onPaymentComplete,
  onPaymentError,
}: PaymentButtonProps) {
  const [state, setState] = useState<PaymentState>(isPaid ? "paid" : "idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePayment = useCallback(async () => {
    // Prevent double-clicks
    if (state === "loading" || state === "paid") {
      return;
    }

    setState("loading");
    setErrorMessage(null);
    onPaymentStart?.();

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optimization_id: optimizationId }),
      });

      const data = await response.json();

      // Handle trial eligible case (free download)
      if (data.trialEligible && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        onPaymentComplete?.();
        return;
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409 && data.redirectUrl) {
          // Already paid - redirect to download
          window.location.href = data.redirectUrl;
          onPaymentComplete?.();
          return;
        }

        const message = data.error || "Error al iniciar el pago";
        setErrorMessage(message);
        setState("error");
        onPaymentError?.(message);
        return;
      }

      // Redirect to WebPay
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de pago");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al conectar con el servidor";
      setErrorMessage(message);
      setState("error");
      onPaymentError?.(message);
    }
  }, [
    optimizationId,
    state,
    onPaymentStart,
    onPaymentComplete,
    onPaymentError,
  ]);

  const handleRetry = useCallback(() => {
    setState("idle");
    setErrorMessage(null);
  }, []);

  // Already paid state
  if (state === "paid" || isPaid) {
    return (
      <div className={cn("text-center", className)}>
        <div className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
          <CheckIcon className="h-4 w-4" />
          Pago completado
        </div>
      </div>
    );
  }

  // Error state with retry
  if (state === "error" || state === "failed" || state === "cancelled") {
    return (
      <div className={cn("text-center", className)}>
        <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {state === "cancelled"
            ? "Pago cancelado"
            : errorMessage || "Error al procesar el pago"}
        </div>
        <button
          onClick={handleRetry}
          className={cn(
            "rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground",
            "hover:bg-primary/90 transition-colors"
          )}
        >
          Reintentar pago — {price}
        </button>
      </div>
    );
  }

  // Default state (idle/loading)
  return (
    <button
      onClick={handlePayment}
      disabled={state === "loading"}
      className={cn(
        "rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground",
        "hover:bg-primary/90 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "inline-flex items-center gap-2",
        className
      )}
    >
      {state === "loading" ? (
        <>
          <LoadingSpinner className="h-4 w-4" />
          Procesando...
        </>
      ) : (
        <>
          <LockIcon className="h-4 w-4" />
          Descargar CV optimizado — {price}
        </>
      )}
    </button>
  );
}

// Simple icon components
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

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
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
