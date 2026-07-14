import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SocialContact,
  SocialConversation,
  SocialMessage,
  SocialPlatform,
  SocialMessageKind,
  SocialDirection,
} from "@/types/database";
import type { MetaMessagingEvent, MetaChangeEvent } from "./meta-types";

// Cliente de service role (src/lib/supabase/admin.ts) — todo este módulo
// bypassea RLS a propósito, lo usan el webhook y el backfill.
type AdminClient = SupabaseClient;

const UNIQUE_VIOLATION = "23505";

export async function messageExists(admin: AdminClient, externalId: string): Promise<boolean> {
  const { data } = await admin
    .from("social_messages")
    .select("id")
    .eq("external_id", externalId)
    .maybeSingle();
  return !!data;
}

// Contacto que nos escribió — crea si no existe (interaction_count=1) o
// suma una interacción más si ya existía. NO usar para ecos/salientes:
// interaction_count mide cuánto nos escribió el contacto, no cuánto le
// escribimos nosotros.
export async function recordInboundContact(
  admin: AdminClient,
  platform: SocialPlatform,
  externalId: string,
  patch?: { username?: string | null; displayName?: string | null },
): Promise<SocialContact> {
  const { data: existing } = await admin
    .from("social_contacts")
    .select("*")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .maybeSingle<SocialContact>();

  if (existing) {
    const { data: updated, error } = await admin
      .from("social_contacts")
      .update({
        interaction_count: existing.interaction_count + 1,
        last_seen_at: new Date().toISOString(),
        ...(patch?.username ? { username: patch.username } : {}),
        ...(patch?.displayName ? { display_name: patch.displayName } : {}),
      })
      .eq("id", existing.id)
      .select()
      .single<SocialContact>();
    if (error) throw error;
    return updated;
  }

  const { data: created, error } = await admin
    .from("social_contacts")
    .insert({
      platform,
      external_id: externalId,
      username: patch?.username ?? null,
      display_name: patch?.displayName ?? null,
      interaction_count: 1,
    })
    .select()
    .single<SocialContact>();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      // Carrera: otra request insertó el mismo contacto justo antes.
      return recordInboundContact(admin, platform, externalId, patch);
    }
    throw error;
  }
  return created;
}

// Contacto que recibió un mensaje NUESTRO (eco, o vamos a mandarle un DM
// nosotros primero) — get-or-create sin tocar interaction_count.
export async function ensureContact(
  admin: AdminClient,
  platform: SocialPlatform,
  externalId: string,
): Promise<SocialContact> {
  const { data: existing } = await admin
    .from("social_contacts")
    .select("*")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .maybeSingle<SocialContact>();

  if (existing) return existing;

  const { data: created, error } = await admin
    .from("social_contacts")
    .insert({ platform, external_id: externalId, interaction_count: 0 })
    .select()
    .single<SocialContact>();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return ensureContact(admin, platform, externalId);
    }
    throw error;
  }
  return created;
}

// Una sola conversación 'dm' por contacto (índice único parcial en la
// migración 0014) — si dos requests concurrentes intentan crearla,
// la que pierde la carrera recupera la que ganó.
export async function findOrCreateDmConversation(
  admin: AdminClient,
  contactId: number,
  platform: SocialPlatform,
): Promise<SocialConversation> {
  const { data: existing } = await admin
    .from("social_conversations")
    .select("*")
    .eq("contact_id", contactId)
    .eq("kind", "dm")
    .maybeSingle<SocialConversation>();

  if (existing) return existing;

  const { data: created, error } = await admin
    .from("social_conversations")
    .insert({ contact_id: contactId, platform, kind: "dm", status: "pending" })
    .select()
    .single<SocialConversation>();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return findOrCreateDmConversation(admin, contactId, platform);
    }
    throw error;
  }
  return created;
}

// Cada comentario nuevo es su propia conversación (a diferencia del DM,
// que es un hilo continuo) — siempre inserta una fila nueva.
export async function createCommentConversation(
  admin: AdminClient,
  params: {
    contactId: number;
    platform: SocialPlatform;
    igMediaId: string | null;
    // El webhook no lo tiene a mano (se completa después, en la etapa de
    // clasificación); el backfill sí, porque ya trajo el media con
    // caption en el mismo pedido — pasarlo acá evita un fetch de más.
    igMediaCaption?: string | null;
  },
): Promise<SocialConversation> {
  const { data, error } = await admin
    .from("social_conversations")
    .insert({
      contact_id: params.contactId,
      platform: params.platform,
      kind: "comment",
      ig_media_id: params.igMediaId,
      ig_media_caption: params.igMediaCaption ?? null,
      status: "pending",
    })
    .select()
    .single<SocialConversation>();
  if (error) throw error;
  return data;
}

// Idempotente por external_id: si el mensaje ya existe (reintento del
// webhook) devuelve null en vez de tirar error, para que el caller sepa
// que no hay nada nuevo que procesar.
export async function insertMessage(
  admin: AdminClient,
  params: {
    conversationId: number;
    direction: SocialDirection;
    kind: SocialMessageKind;
    externalId: string;
    text: string | null;
    rawPayload: unknown;
    sentBy?: string | null;
  },
): Promise<SocialMessage | null> {
  const { data, error } = await admin
    .from("social_messages")
    .insert({
      conversation_id: params.conversationId,
      direction: params.direction,
      kind: params.kind,
      external_id: params.externalId,
      text: params.text,
      raw_payload: (params.rawPayload ?? {}) as Record<string, unknown>,
      sent_by: params.sentBy ?? null,
    })
    .select()
    .single<SocialMessage>();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;
    throw error;
  }
  return data;
}

export type IngestResult = {
  contact: SocialContact;
  conversation: SocialConversation;
  message: SocialMessage;
} | null;

export async function ingestInboundDm(
  admin: AdminClient,
  event: MetaMessagingEvent,
): Promise<IngestResult> {
  const senderId = event.sender?.id;
  const messageId = event.message?.mid;
  if (!senderId || !messageId) return null;

  // Dedupe temprano: si ya lo procesamos, ni tocamos contacto/conversación.
  if (await messageExists(admin, messageId)) return null;

  const contact = await recordInboundContact(admin, "instagram", senderId);
  const conversation = await findOrCreateDmConversation(admin, contact.id, "instagram");

  const message = await insertMessage(admin, {
    conversationId: conversation.id,
    direction: "in",
    kind: "dm",
    externalId: messageId,
    text: event.message?.text ?? null,
    rawPayload: event,
  });
  if (!message) return null;

  // Un mensaje nuevo siempre reabre la conversación a 'pending', aunque
  // ya estuviera 'replied' o 'archived' — hay algo nuevo que un admin
  // tiene que ver.
  await admin
    .from("social_conversations")
    .update({ status: "pending", last_inbound_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { contact, conversation, message };
}

export async function ingestOutboundEcho(
  admin: AdminClient,
  event: MetaMessagingEvent,
): Promise<void> {
  const recipientId = event.recipient?.id;
  const messageId = event.message?.mid;
  if (!recipientId || !messageId) return;

  if (await messageExists(admin, messageId)) return;

  const contact = await ensureContact(admin, "instagram", recipientId);
  const conversation = await findOrCreateDmConversation(admin, contact.id, "instagram");

  await insertMessage(admin, {
    conversationId: conversation.id,
    direction: "out",
    kind: "dm",
    externalId: messageId,
    text: event.message?.text ?? null,
    rawPayload: event,
  });
}

export async function ingestInboundComment(
  admin: AdminClient,
  change: MetaChangeEvent,
): Promise<IngestResult> {
  const value = change.value;
  const commentId = value?.id;
  if (!commentId) return null;

  if (await messageExists(admin, commentId)) return null;

  const senderId = value?.from?.id;
  if (!senderId) return null; // sin remitente no hay a quién responderle

  const contact = await recordInboundContact(admin, "instagram", senderId, {
    username: value?.from?.username ?? null,
  });

  const conversation = await createCommentConversation(admin, {
    contactId: contact.id,
    platform: "instagram",
    igMediaId: value?.media?.id ?? null,
  });

  const message = await insertMessage(admin, {
    conversationId: conversation.id,
    direction: "in",
    kind: "comment",
    externalId: commentId,
    text: value?.text ?? null,
    rawPayload: change,
  });
  if (!message) return null;

  await admin
    .from("social_conversations")
    .update({ last_inbound_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return { contact, conversation, message };
}
