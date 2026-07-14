import { createHmac, timingSafeEqual } from "crypto";

// Header X-Hub-Signature-256: "sha256=<hmac hex>", calculado por Meta
// sobre el body CRUDO (bytes tal cual llegaron, antes de cualquier
// parseo) usando el App Secret. Ver
// https://developers.facebook.com/docs/messenger-platform/webhook#security
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signatureHeader) return false;

  const [scheme, receivedHash] = signatureHeader.split("=");
  if (scheme !== "sha256" || !receivedHash) return false;

  const expectedHash = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
