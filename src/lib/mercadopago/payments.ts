const MP_API_URL = "https://api.mercadopago.com";

export type MpPayment = {
  id: number;
  status: string;
  external_reference: string | null;
};

// Se consulta con el access token de la propia plataforma (no el del
// vendedor): los pagos creados a través de nuestra app son visibles con
// las credenciales de la aplicación marketplace, independientemente de a
// qué vendedor pertenezca el collector — evita el problema de no saber
// todavía a qué vendedor pertenece el pago antes de leerlo.
export async function getPayment(paymentId: string): Promise<MpPayment> {
  const res = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });

  if (!res.ok) {
    throw new Error(`MP v1/payments/${paymentId} falló: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
