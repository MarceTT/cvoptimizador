"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

type PaymentStatus = "idle" | "loading" | "redirecting" | "error" | "authorized" | "cancelled";

interface PaymentButtonProps {
  optimizationId: string;
  amount: number;
  onStatusChange?: (status: PaymentStatus) => void;
  className?: string;
}

export function PaymentButton({
  optimizationId,
  amount,
  onStatusChange,
  className,
}: PaymentButtonProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const updateStatus = (newStatus: PaymentStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  const handlePayment = async () => {
    setError(null);
    updateStatus("loading");

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optimization_id: optimizationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al crear el pago");
      }

      const { redirect_url } = await response.json();

      updateStatus("redirecting");

      // Redirect to WebPay
      window.location.href = redirect_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
      updateStatus("error");
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (status === "authorized") {
    return (
      <Button size="lg" disabled className={className}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Pago completado
      </Button>
    );
  }

  if (status === "loading" || status === "redirecting") {
    return (
      <Button size="lg" disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {status === "redirecting" ? "Redirigiendo a WebPay..." : "Procesando..."}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="lg"
        onClick={handlePayment}
        disabled={status !== "idle" && status !== "error" && status !== "cancelled"}
        className={className}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Pagar {formatPrice(amount)}
      </Button>
      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Pago seguro con WebPay
      </p>
    </div>
  );
}
