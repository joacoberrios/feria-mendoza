const MP_API_URL = "https://api.mercadopago.com";

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
