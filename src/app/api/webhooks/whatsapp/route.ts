import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMetaSignature } from "@/lib/inbox/meta-signature";
import { ingestInboundMessage, ingestEcho, ingestStatus } from "@/lib/whatsapp/ingest";
import { classifyAndDraft } from "@/lib/inbox/classify";
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/meta-types";

// Handshake de suscripción — mismo mecanismo que Instagram, token propio
// (WHATSAPP_WEBHOOK_VERIFY_TOKEN, puede ser distinto del de Instagram).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET)) {
    console.error("[whatsapp:webhook] firma inválida, se ignora la notificación");
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  after(() => processPayload(rawBody));

  return NextResponse.json({ ok: true }, { status: 200 });
}

async function processPayload(rawBody: string) {
  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[whatsapp:webhook] payload no es JSON válido:", err);
    return;
  }

  const admin = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      if (change.field === "messages") {
        const profileByWaId = new Map(
          (value?.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]),
        );

        for (const message of value?.messages ?? []) {
          try {
            const result = await ingestInboundMessage(
              admin,
              message,
              profileByWaId.get(message.from ?? "") ?? null,
            );
            if (result) await classifyAndDraft(admin, result.conversation.id, result.message.id);
          } catch (err) {
            console.error("[whatsapp:webhook] error procesando mensaje:", err);
          }
        }

        for (const status of value?.statuses ?? []) {
          try {
            await ingestStatus(admin, status);
          } catch (err) {
            console.error("[whatsapp:webhook] error procesando estado de entrega:", err);
          }
        }
      } else if (change.field === "smb_message_echoes") {
        for (const echo of value?.message_echoes ?? []) {
          try {
            await ingestEcho(admin, echo);
          } catch (err) {
            console.error("[whatsapp:webhook] error procesando eco de Coexistence:", err);
          }
        }
      } else {
        // Campo no reconocido/no suscripto todavía — se loguea y se
        // sigue, nunca rompe el procesamiento del resto del payload.
        console.log("[whatsapp:webhook] field no manejado:", change.field);
      }
    }
  }
}
