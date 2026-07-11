import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayment } from "@/lib/mercadopago/payments";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook-signature";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const body = await request.json().catch(() => null);

  const type = searchParams.get("type") ?? body?.type ?? body?.topic;
  const dataId = searchParams.get("data.id") ?? body?.data?.id;

  if (!dataId) {
    // No hay nada que procesar; confirmamos para que MP no reintente.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const isValidSignature = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId: String(dataId),
  });

  if (!isValidSignature) {
    console.error("[mercadopago:webhook] firma inválida, se ignora la notificación");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (type !== "payment") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const admin = createAdminClient();

  try {
    const payment = await getPayment(String(dataId));

    if (!payment.external_reference) {
      console.error("[mercadopago:webhook] pago sin external_reference:", payment.id);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const orderId = Number(payment.external_reference);
    const { data: order } = await admin
      .from("orders")
      .select("id, product_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      console.error("[mercadopago:webhook] orden no encontrada:", orderId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Idempotencia: MP reintenta notificaciones: si ya la procesamos, no
    // hacer nada de nuevo.
    if (order.status === "paid" || order.status === "disputed") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (payment.status !== "approved") {
      // Pago rechazado, en proceso, etc. — la orden queda 'pending', el
      // comprador puede reintentar la compra más adelante.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Guarda contra doble venta: el UPDATE solo afecta la fila si el
    // producto sigue 'active'. Si dos pagos casi simultáneos confirman,
    // solo el primero en llegar acá gana la carrera.
    const { data: updatedProducts, error: productUpdateError } = await admin
      .from("products")
      .update({ status: "sold" })
      .eq("id", order.product_id)
      .eq("status", "active")
      .select("id");

    if (productUpdateError) {
      console.error("[mercadopago:webhook] error marcando producto vendido:", productUpdateError);
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }

    const wonRace = (updatedProducts?.length ?? 0) > 0;

    const { error: orderUpdateError } = await admin
      .from("orders")
      .update({
        mp_payment_id: String(payment.id),
        status: wonRace ? "paid" : "disputed",
      })
      .eq("id", order.id);

    if (orderUpdateError) {
      console.error("[mercadopago:webhook] error actualizando la orden:", orderUpdateError);
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }

    if (!wonRace) {
      // El pago se cobró de verdad pero el producto ya se lo llevó otro
      // comprador que pagó antes. Requiere reembolso manual por ahora
      // (la gestión de disputas/reembolsos automatizados es Fase 5).
      console.error(
        `[mercadopago:webhook] doble venta detectada: orden ${order.id}, producto ${order.product_id} ya estaba vendido. Requiere reembolso manual.`,
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mercadopago:webhook] error procesando la notificación:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
