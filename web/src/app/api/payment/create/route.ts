import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { generateIdempotencyKey, createWebPayTransaction } from "@/lib/webpay";
import { checkTrialEligibility } from "@/lib/trial";
import type { Payment, PaymentStatus } from "@cvoptimizador/types";

const AMOUNT_CLP = 2990;

/**
 * POST /api/payment/create
 * Creates a WebPay transaction for an optimization.
 * Implements idempotency: same optimization_id returns same pending transaction.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();
    const supabase = createAdminClient();

    // Parse request body
    const body = await request.json();
    const { optimization_id } = body;

    if (!optimization_id) {
      return NextResponse.json(
        { error: "optimization_id es requerido" },
        { status: 400 }
      );
    }

    // Verify optimization exists and belongs to user
    const { data: optimization, error: optError } = await supabase
      .from("optimizations")
      .select("id, user_id, status")
      .eq("id", optimization_id)
      .single();

    if (optError || !optimization) {
      return NextResponse.json(
        { error: "Optimización no encontrada" },
        { status: 404 }
      );
    }

    if (optimization.user_id !== user.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // Check trial eligibility - if eligible, skip payment
    const trialCheck = await checkTrialEligibility(user.id);
    if (trialCheck.isEligible) {
      // User is eligible for free trial - redirect to download directly
      return NextResponse.json(
        {
          trialEligible: true,
          redirectUrl: `/download/${optimization_id}?trial=true`,
        },
        { status: 200 }
      );
    }

    // Check for existing payments on this optimization
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("id, status, webpay_token")
      .eq("optimization_id", optimization_id)
      .order("created_at", { ascending: false });

    // Check if already paid (AUTHORIZED status)
    const paidPayment = existingPayments?.find(
      (p: { status: PaymentStatus }) => p.status === "authorized"
    );
    if (paidPayment) {
      // Already paid - redirect to download
      return NextResponse.json(
        {
          error: "Ya pagaste esta optimización",
          redirectUrl: `/download/${optimization_id}`,
        },
        { status: 409 }
      );
    }

    // Check for existing pending transaction (idempotency)
    const pendingPayment = existingPayments?.find(
      (p: { status: PaymentStatus; webpay_token: string | null }) =>
        p.status === "pending" && p.webpay_token
    );

    if (pendingPayment) {
      // Return existing pending transaction (idempotent behavior)
      // Note: In production, we'd check if the pending transaction is still valid
      // For MVP, we create a new one since pending ones may have expired
    }

    // Generate idempotency key for this payment attempt
    const idempotencyKey = generateIdempotencyKey(optimization_id, user.id);

    // Check if we already have a payment with this idempotency key
    const { data: existingByKey } = await supabase
      .from("payments")
      .select("id, status, webpay_token")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existingByKey) {
      if (existingByKey.status === "authorized") {
        return NextResponse.json(
          {
            error: "Ya pagaste esta optimización",
            redirectUrl: `/download/${optimization_id}`,
          },
          { status: 409 }
        );
      }
      
      if (existingByKey.status === "pending" && existingByKey.webpay_token) {
        // Idempotent return: same request = same response
        const webpayUrl = `${process.env.WEBPAY_URL || "https://webpay3gint.transbank.cl"}/webpayserver/initTransaction`;
        return NextResponse.json({
          token: existingByKey.webpay_token,
          url: `${webpayUrl}?token_ws=${existingByKey.webpay_token}`,
        });
      }
    }

    // Create WebPay transaction
    const webpayOrder = `CV-${optimization_id.slice(0, 8)}-${Date.now()}`;
    const returnUrl = `${process.env.NEXTAUTH_URL}/api/payment/confirm`;

    const webpayResult = await createWebPayTransaction({
      amount: AMOUNT_CLP,
      orderId: webpayOrder,
      returnUrl,
      sessionId: user.id,
    });

    // Store payment record
    const paymentData: Omit<Payment, "id" | "created_at"> = {
      optimization_id,
      amount: AMOUNT_CLP,
      currency: "CLP",
      webpay_token: webpayResult.token,
      webpay_order: webpayOrder,
      status: "pending",
      idempotency_key: idempotencyKey,
      confirmed_at: null,
    };

    const { error: insertError } = await supabase
      .from("payments")
      .insert(paymentData);

    if (insertError) {
      console.error("Error inserting payment:", insertError);
      return NextResponse.json(
        { error: "Error al crear el pago" },
        { status: 500 }
      );
    }

    // Return WebPay redirect URL
    return NextResponse.json({
      token: webpayResult.token,
      url: webpayResult.url,
    });
  } catch (error) {
    console.error("Payment create error:", error);
    
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Debés iniciar sesión" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
