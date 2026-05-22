import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import {
  confirmWebPayTransaction,
  webpayStatusToPaymentStatus,
} from "@/lib/webpay";
import type { PaymentStatus } from "@cvoptimizador/types";

/**
 * GET /api/payment/confirm
 * Handles WebPay callback after user completes/cancels payment.
 * WebPay redirects here with token_ws parameter.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenWs = searchParams.get("token_ws");
  const tbkToken = searchParams.get("TBK_TOKEN"); // User cancelled at WebPay
  const tbkOrdenCompra = searchParams.get("TBK_ORDEN_COMPRA");

  const supabase = createAdminClient();

  // Case 1: User cancelled at WebPay (no payment made)
  if (tbkToken && tbkOrdenCompra) {
    // Find payment by order number
    const { data: payment } = await supabase
      .from("payments")
      .select("id, optimization_id, status")
      .eq("webpay_order", tbkOrdenCompra)
      .single();

    if (payment && payment.status === "pending") {
      // Mark as nullified (user cancelled)
      await supabase
        .from("payments")
        .update({ status: "nullified" as PaymentStatus })
        .eq("id", payment.id);
    }

    // Redirect back to results with cancelled state
    const optimizationId = payment?.optimization_id;
    const redirectUrl = optimizationId
      ? `/results/${optimizationId}?payment=cancelled`
      : "/?payment=cancelled";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Case 2: Normal flow - token_ws present
  if (!tokenWs) {
    // Invalid callback - no token
    console.error("Payment confirm: No token received");
    return NextResponse.redirect(
      new URL("/?payment=error&reason=no_token", request.url)
    );
  }

  // Find payment by WebPay token
  const { data: payment, error: findError } = await supabase
    .from("payments")
    .select("id, optimization_id, status, webpay_token")
    .eq("webpay_token", tokenWs)
    .single();

  if (findError || !payment) {
    // Invalid token - possible tampering
    console.error("Payment confirm: Invalid token", tokenWs);
    return NextResponse.redirect(
      new URL("/?payment=error&reason=invalid_token", request.url)
    );
  }

  // Case 3: Already confirmed (idempotent)
  if (payment.status === "authorized") {
    // Already successful - redirect to download
    return NextResponse.redirect(
      new URL(`/download/${payment.optimization_id}`, request.url)
    );
  }

  // Case 4: Already failed/nullified - show retry option
  if (payment.status === "nullified" || payment.status === "failed") {
    return NextResponse.redirect(
      new URL(
        `/results/${payment.optimization_id}?payment=${payment.status}`,
        request.url
      )
    );
  }

  // Case 5: Pending - need to confirm with WebPay
  try {
    const confirmation = await confirmWebPayTransaction(tokenWs);

    // Map WebPay status to our status
    const newStatus = webpayStatusToPaymentStatus(confirmation.status);

    // Update payment record
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (newStatus === "authorized") {
      updateData.confirmed_at = new Date().toISOString();
    }

    await supabase.from("payments").update(updateData).eq("id", payment.id);

    // Redirect based on result
    if (newStatus === "authorized") {
      // Success - redirect to download
      return NextResponse.redirect(
        new URL(`/download/${payment.optimization_id}`, request.url)
      );
    }

    // Failed or nullified - back to results with status
    return NextResponse.redirect(
      new URL(
        `/results/${payment.optimization_id}?payment=${newStatus}`,
        request.url
      )
    );
  } catch (error) {
    console.error("WebPay confirm error:", error);

    // Mark as failed on error
    await supabase
      .from("payments")
      .update({ status: "failed" as PaymentStatus })
      .eq("id", payment.id);

    return NextResponse.redirect(
      new URL(
        `/results/${payment.optimization_id}?payment=error`,
        request.url
      )
    );
  }
}

/**
 * POST /api/payment/confirm
 * Alternative endpoint for WebPay POST callbacks (some integrations use POST)
 */
export async function POST(request: NextRequest) {
  // Extract token from form data or body
  try {
    const contentType = request.headers.get("content-type") || "";
    let tokenWs: string | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      tokenWs = formData.get("token_ws") as string | null;
    } else {
      const body = await request.json();
      tokenWs = body.token_ws;
    }

    if (tokenWs) {
      // Redirect to GET handler with token
      const url = new URL("/api/payment/confirm", request.url);
      url.searchParams.set("token_ws", tokenWs);
      return NextResponse.redirect(url);
    }

    return NextResponse.redirect(
      new URL("/?payment=error&reason=no_token", request.url)
    );
  } catch (error) {
    console.error("Payment confirm POST error:", error);
    return NextResponse.redirect(
      new URL("/?payment=error&reason=parse_error", request.url)
    );
  }
}
