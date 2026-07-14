import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMetaSignature } from "@/lib/inbox/meta-signature";
import { ingestInboundDm, ingestOutboundEcho, ingestInboundComment } from "@/lib/inbox/ingest";
import { classifyAndDraft } from "@/lib/inbox/classify";
import type { MetaWebhookPayload } from "@/lib/inbox/meta-types";

// Handshake de suscripción del webhook — Meta llama esto una vez al
// guardar/verificar la URL en el dashboard. Ver docs/inbox-setup.md.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  // La firma se calcula sobre el body CRUDO — hay que leerlo como texto
  // antes de cualquier JSON.parse (si se lee dos veces, la segunda ya no
  // matchea byte a byte).
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    console.error("[instagram:webhook] firma inválida, se ignora la notificación");
    // 403, y no tocamos la DB: una firma inválida no es un evento real de
    // Meta (o el App Secret está mal configurado).
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  // Confirmamos rápido — Meta reintenta si no responde 200 en pocos
  // segundos — y procesamos el payload después de responder.
  after(() => processPayload(rawBody));

  return NextResponse.json({ ok: true }, { status: 200 });
}

async function processPayload(rawBody: string) {
  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[instagram:webhook] payload no es JSON válido:", err);
    return;
  }

  const admin = createAdminClient();
  const igUserId = process.env.IG_USER_ID;

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      try {
        const isEcho = event.message?.is_echo === true || event.sender?.id === igUserId;
        if (isEcho) {
          await ingestOutboundEcho(admin, event);
        } else {
          const result = await ingestInboundDm(admin, event);
          if (result) await classifyAndDraft(admin, result.conversation.id, result.message.id);
        }
      } catch (err) {
        console.error("[instagram:webhook] error procesando mensaje:", err);
      }
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      try {
        const result = await ingestInboundComment(admin, change);
        if (result) await classifyAndDraft(admin, result.conversation.id, result.message.id);
      } catch (err) {
        console.error("[instagram:webhook] error procesando comentario:", err);
      }
    }
  }
}
