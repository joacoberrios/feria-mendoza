const MP_API_URL = "https://api.mercadopago.com";
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

type CreatePreferenceParams = {
  sellerAccessToken: string;
  orderId: number;
  productTitle: string;
  unitPrice: number;
  marketplaceFee: number;
  siteUrl: string;
};

type MpPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

export async function createCheckoutPreference({
  sellerAccessToken,
  orderId,
  productTitle,
  unitPrice,
  marketplaceFee,
  siteUrl,
}: CreatePreferenceParams): Promise<MpPreferenceResponse> {
  const res = await fetch(`${MP_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sellerAccessToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: productTitle,
          quantity: 1,
          currency_id: "ARS",
          unit_price: unitPrice,
        },
      ],
      marketplace_fee: marketplaceFee,
      external_reference: String(orderId),
      back_urls: {
        success: `${siteUrl}/checkout/exito?order=${orderId}`,
        failure: `${siteUrl}/checkout/fallo?order=${orderId}`,
        pending: `${siteUrl}/checkout/pendiente?order=${orderId}`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
    }),
  });

  if (!res.ok) {
    throw new Error(`MP checkout/preferences falló: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

type CreateCreditPreferenceParams = {
  userId: string;
  packageId: number;
  packageName: string;
  price: number;
  siteUrl: string;
};

export async function createCreditPreference({
  userId,
  packageId,
  packageName,
  price,
  siteUrl,
}: CreateCreditPreferenceParams): Promise<MpPreferenceResponse> {
  if (!MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN no configurado");

  // Prefijo "credits:" diferencia estas notificaciones de las ventas de
  // producto en el webhook. El timestamp evita colisiones si el mismo
  // usuario compra el mismo paquete dos veces seguidas.
  const externalRef = `credits:${userId}:${packageId}:${Date.now()}`;

  const res = await fetch(`${MP_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [{ title: packageName, quantity: 1, currency_id: "ARS", unit_price: price }],
      external_reference: externalRef,
      back_urls: {
        success: `${siteUrl}/creditos?ok=1`,
        failure: `${siteUrl}/creditos?error=pago_fallido`,
        pending: `${siteUrl}/creditos?pending=1`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
    }),
  });

  if (!res.ok) {
    throw new Error(`MP preferences (créditos) falló: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
