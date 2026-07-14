import type { SupabaseClient } from "@supabase/supabase-js";
import {
  messageExists,
  recordInboundContact,
  ensureContact,
  findOrCreateDmConversation,
  insertMessage,
  type IngestResult,
} from "@/lib/inbox/ingest";
import type { WhatsAppInboundMessage, WhatsAppEcho, WhatsAppStatus } from "./meta-types";

type AdminClient = SupabaseClient;

const FREE_WINDOW_HOURS = 24;

// Tipos de mensaje que todavía no tienen manejo de contenido real — se
// guarda un placeholder para que la conversación no quede invisible en
// la bandeja (mejor un "[imagen]" que un mensaje vacío o perdido).
const PLACEHOLDER_BY_TYPE: Record<string, string> = {
  image: "[imagen]",
  audio: "[audio]",
  video: "[video]",
  document: "[documento]",
  sticker: "[sticker]",
  location: "[ubicación]",
  contacts: "[contacto compartido]",
};

function extractText(message: WhatsAppInboundMessage): string {
  if (message.type === "text") return message.text?.body ?? "";
  return PLACEHOLDER_BY_TYPE[message.type ?? ""] ?? `[mensaje de tipo ${message.type ?? "desconocido"}]`;
}

// Mensaje real del cliente (llega por field="messages").
export async function ingestInboundMessage(
  admin: AdminClient,
  message: WhatsAppInboundMessage,
  profileName: string | null,
): Promise<IngestResult> {
  const waId = message.from;
  const wamid = message.id;
  if (!waId || !wamid) return null;

  if (await messageExists(admin, wamid)) return null;

  const contact = await recordInboundContact(admin, "whatsapp", waId, {
    displayName: profileName,
    waId,
    // Meta no manda un "phone_display" separado — wa_id ya son los
    // dígitos del número; si más adelante se quiere un formato más
    // lindo para la UI, se deriva de acá, no hace falta otro fetch.
    phoneDisplay: waId,
  });

  const conversation = await findOrCreateDmConversation(admin, contact.id, "whatsapp");

  const insertedMessage = await insertMessage(admin, {
    conversationId: conversation.id,
    direction: "in",
    kind: "dm",
    externalId: wamid,
    text: extractText(message),
    rawPayload: message,
    wamid,
    origin: "customer",
  });
  if (!insertedMessage) return null;

  const now = new Date();
  const nowIso = now.toISOString();
  const windowExpiresIso = new Date(now.getTime() + FREE_WINDOW_HOURS * 3_600_000).toISOString();

  await admin
    .from("social_conversations")
    .update({
      status: "pending",
      last_inbound_at: nowIso,
      customer_last_message_at: nowIso,
      free_window_expires_at: windowExpiresIso,
      // El cliente volvió a escribir — ya no está "frío", cancela
      // cualquier sugerencia de seguimiento pendiente sobre este hilo.
      follow_up_status: "none",
    })
    .eq("id", conversation.id);

  return { contact, conversation, message: insertedMessage };
}

// Eco de Coexistence: un mensaje que el negocio mandó A MANO desde la
// app de WhatsApp Business del teléfono (no desde nuestra API). Llega
// por field="smb_message_echoes", separado de "messages".
//
// CRÍTICO: si había un borrador sugerido esperando aprobación en esta
// conversación, hay que descartarlo automáticamente — el admin ya
// respondió por otro lado, aprobar ese borrador viejo mandaría una
// respuesta duplicada/contradictoria.
export async function ingestEcho(admin: AdminClient, echo: WhatsAppEcho): Promise<void> {
  const customerWaId = echo.to;
  const wamid = echo.id;
  if (!customerWaId || !wamid) return;

  if (await messageExists(admin, wamid)) return;

  const contact = await ensureContact(admin, "whatsapp", customerWaId);
  const conversation = await findOrCreateDmConversation(admin, contact.id, "whatsapp");

  const inserted = await insertMessage(admin, {
    conversationId: conversation.id,
    direction: "out",
    kind: "dm",
    externalId: wamid,
    text: echo.type === "text" ? (echo.text?.body ?? null) : (PLACEHOLDER_BY_TYPE[echo.type ?? ""] ?? null),
    rawPayload: echo,
    wamid,
    origin: "phone_app",
  });
  if (!inserted) return;

  await admin
    .from("social_conversations")
    .update({ status: "replied", business_last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  // Reusa error_detail como nota de motivo de descarte — no es una
  // falla de envío, pero no amerita una columna nueva solo para este
  // string fijo.
  await admin
    .from("reply_drafts")
    .update({ status: "discarded", error_detail: "answered_from_phone" })
    .eq("conversation_id", conversation.id)
    .eq("status", "suggested");
}

// Estados de entrega de mensajes SALIENTES (sent/delivered/read/failed).
// Llegan por field="messages" también, en value.statuses[].
export async function ingestStatus(admin: AdminClient, status: WhatsAppStatus): Promise<void> {
  const wamid = status.id;
  const newStatus = status.status;
  if (!wamid || !newStatus) return;

  const errorMessage =
    newStatus === "failed" && status.errors?.[0]
      ? (status.errors[0].message ?? status.errors[0].title ?? `Error ${status.errors[0].code ?? ""}`)
      : null;

  await admin
    .from("social_messages")
    .update({
      delivery_status: newStatus,
      ...(errorMessage ? { delivery_error: errorMessage } : {}),
    })
    .eq("wamid", wamid);
}
