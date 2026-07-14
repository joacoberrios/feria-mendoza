import { createHmac, timingSafeEqual } from "crypto";

// Header X-Hub-Signature-256: "sha256=<hmac hex>", calculado por Meta
// sobre el body CRUDO (bytes tal cual llegaron, antes de cualquier
// parseo) usando el App Secret. Ver
// https://developers.facebook.com/docs/messenger-platform/webhook#security
//
// El secret se pasa como parámetro (no se lee de una env var fija acá
// adentro) porque Instagram y WhatsApp pueden vivir en apps de Meta
// distintas con App Secrets distintos (META_APP_SECRET vs
// WHATSAPP_APP_SECRET) — mismo algoritmo, dos webhooks, cada uno con el
// suyo.
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !signatureHeader) return false;

  const [scheme, receivedHash] = signatureHeader.split("=");
  if (scheme !== "sha256" || !receivedHash) return false;

  const expectedHash = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
