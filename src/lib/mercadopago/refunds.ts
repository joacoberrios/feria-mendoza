import { getValidSellerAccessToken } from "./tokens";

const MP_API_URL = "https://api.mercadopago.com";

export type RefundResult =
  | { ok: true; refundId: string }
  | { ok: false; error: string };

// Emite un reembolso total del pago. Se usa el token del vendedor porque
// el pago fue creado con ese token y el dinero está en su cuenta. MP
// revierte la marketplace_fee proporcionalmente de forma automática.
export async function issueRefund(
  mpPaymentId: string,
  sellerId: string,
): Promise<RefundResult> {
  const sellerToken = await getValidSellerAccessToken(sellerId);
  if (!sellerToken) {
    return { ok: false, error: "No se pudo obtener el token del vendedor. Puede que haya revocado el acceso a Mercado Pago." };
  }

  // UUID v4 único por intento — MP lo exige para idempotencia. Si la red
  // reintenta la misma llamada con el mismo key, MP la deduplica y no
  // emite un segundo reembolso. Cada llamada a issueRefund genera uno nuevo.
  const idempotencyKey = crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(`${MP_API_URL}/v1/payments/${mpPaymentId}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sellerToken}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    return { ok: false, error: `Error de red al contactar Mercado Pago: ${String(err)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `MP /refunds falló (${res.status}): ${body}` };
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true, refundId: String(data.id ?? "") };
}
