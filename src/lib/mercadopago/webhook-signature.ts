import { createHmac, timingSafeEqual } from "crypto";

// Formato del header x-signature: "ts=1704908010,v1=<hmac hex>"
// Template a firmar: "id:{data_id};request-id:{request_id};ts:{ts};"
// Ver: https://www.mercadopago.com.ar/developers (Notifications > Webhooks > Secret signature)
export function verifyWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    }),
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(template).digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
