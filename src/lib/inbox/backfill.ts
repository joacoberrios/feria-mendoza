import type { SupabaseClient } from "@supabase/supabase-js";
import { graphGet } from "./instagram-api";
import {
  messageExists,
  recordInboundContact,
  ensureContact,
  findOrCreateDmConversation,
  createCommentConversation,
  insertMessage,
} from "./ingest";
import { classifyAndDraft } from "./classify";

type AdminClient = SupabaseClient;

// Margen conservador sobre el límite de 200 llamadas/hora de Meta — deja
// aire para lo que el webhook/otras acciones puedan estar usando en la
// misma hora. Si se llega al tope, el botón "Importar pendientes" se
// puede volver a apretar más tarde (todo es idempotente).
const MAX_GRAPH_CALLS_PER_RUN = 60;
const MAX_COMMENT_PAGES_PER_MEDIA = 5;
const CLASSIFY_BATCH_SIZE = 10;

type MediaItem = { id: string; caption?: string };
type CommentItem = { id: string; text?: string; from?: { id?: string; username?: string } };
type ConversationItem = {
  id: string;
  participants?: { data?: { id: string; username?: string }[] };
  messages?: { data?: MessageItem[] };
};
type MessageItem = { id: string; from?: { id?: string }; message?: string; created_time?: string };

export type BackfillIngestSummary = {
  mediaFetched: number;
  commentsIngested: number;
  dmsIngested: number;
  callsUsed: number;
  errors: string[];
};

export async function runBackfillIngest(admin: AdminClient): Promise<BackfillIngestSummary> {
  const summary: BackfillIngestSummary = {
    mediaFetched: 0,
    commentsIngested: 0,
    dmsIngested: 0,
    callsUsed: 0,
    errors: [],
  };

  const igUserId = process.env.IG_USER_ID;
  if (!igUserId) {
    summary.errors.push("Falta IG_USER_ID en las variables de entorno.");
    return summary;
  }

  let calls = 0;
  const budgetOk = () => calls < MAX_GRAPH_CALLS_PER_RUN;

  // 1. Media reciente con caption → comentarios de cada una.
  const mediaResult = await graphGet<{ data?: MediaItem[] }>(admin, `/${igUserId}/media`, {
    fields: "id,caption",
    limit: "25",
  });
  calls++;

  if (!mediaResult.ok) {
    summary.errors.push(`Media: ${mediaResult.error}`);
  } else {
    const mediaList = mediaResult.data.data ?? [];
    summary.mediaFetched = mediaList.length;

    for (const media of mediaList) {
      if (!budgetOk()) {
        summary.errors.push("Se llegó al límite de llamadas de esta corrida — volvé a apretar el botón más tarde.");
        break;
      }

      let after: string | undefined;
      let pages = 0;

      do {
        const commentsResult = await graphGet<{
          data?: CommentItem[];
          paging?: { cursors?: { after?: string }; next?: string };
        }>(admin, `/${media.id}/comments`, {
          fields: "id,text,from",
          limit: "50",
          ...(after ? { after } : {}),
        });
        calls++;
        pages++;

        if (!commentsResult.ok) {
          summary.errors.push(`Comentarios de ${media.id}: ${commentsResult.error}`);
          break;
        }

        for (const comment of commentsResult.data.data ?? []) {
          try {
            const inserted = await ingestBackfilledComment(admin, comment, media.id, media.caption ?? null);
            if (inserted) summary.commentsIngested++;
          } catch (err) {
            summary.errors.push(`Comentario ${comment.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        after = commentsResult.data.paging?.next ? commentsResult.data.paging.cursors?.after : undefined;
      } while (after && pages < MAX_COMMENT_PAGES_PER_MEDIA && budgetOk());
    }
  }

  // 2. DMs recientes (con su historial de mensajes embebido).
  if (budgetOk()) {
    const conversationsResult = await graphGet<{ data?: ConversationItem[] }>(
      admin,
      `/${igUserId}/conversations`,
      { fields: "participants,messages{id,from,message,created_time}", limit: "25" },
    );
    calls++;

    if (!conversationsResult.ok) {
      summary.errors.push(`Conversaciones: ${conversationsResult.error}`);
    } else {
      for (const conv of conversationsResult.data.data ?? []) {
        const otherParticipant = conv.participants?.data?.find((p) => p.id !== igUserId);
        if (!otherParticipant) continue;

        for (const msg of conv.messages?.data ?? []) {
          try {
            const inserted = await ingestBackfilledDmMessage(admin, msg, otherParticipant, igUserId);
            if (inserted) summary.dmsIngested++;
          } catch (err) {
            summary.errors.push(`DM ${msg.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }
  }

  summary.callsUsed = calls;
  return summary;
}

async function ingestBackfilledComment(
  admin: AdminClient,
  comment: CommentItem,
  mediaId: string,
  mediaCaption: string | null,
): Promise<boolean> {
  if (await messageExists(admin, comment.id)) return false;
  const senderId = comment.from?.id;
  if (!senderId) return false;

  const contact = await recordInboundContact(admin, "instagram", senderId, {
    username: comment.from?.username ?? null,
  });

  const conversation = await createCommentConversation(admin, {
    contactId: contact.id,
    platform: "instagram",
    igMediaId: mediaId,
    igMediaCaption: mediaCaption,
  });

  const message = await insertMessage(admin, {
    conversationId: conversation.id,
    direction: "in",
    kind: "comment",
    externalId: comment.id,
    text: comment.text ?? null,
    rawPayload: comment,
  });
  if (!message) return false;

  await admin
    .from("social_conversations")
    .update({ last_inbound_at: new Date().toISOString() })
    .eq("id", conversation.id);

  return true;
}

async function ingestBackfilledDmMessage(
  admin: AdminClient,
  msg: MessageItem,
  otherParticipant: { id: string; username?: string },
  igUserId: string,
): Promise<boolean> {
  if (await messageExists(admin, msg.id)) return false;

  const isOutbound = msg.from?.id === igUserId;

  const contact = isOutbound
    ? await ensureContact(admin, "instagram", otherParticipant.id)
    : await recordInboundContact(admin, "instagram", otherParticipant.id, {
        username: otherParticipant.username ?? null,
      });

  const conversation = await findOrCreateDmConversation(admin, contact.id, "instagram");

  const message = await insertMessage(admin, {
    conversationId: conversation.id,
    direction: isOutbound ? "out" : "in",
    kind: "dm",
    externalId: msg.id,
    text: msg.message ?? null,
    rawPayload: msg,
  });
  if (!message) return false;

  if (!isOutbound) {
    const newTimestamp = msg.created_time ?? new Date().toISOString();
    const { data: current } = await admin
      .from("social_conversations")
      .select("last_inbound_at")
      .eq("id", conversation.id)
      .single<{ last_inbound_at: string | null }>();

    const isNewer = !current?.last_inbound_at || new Date(newTimestamp) > new Date(current.last_inbound_at);
    if (isNewer) {
      await admin
        .from("social_conversations")
        .update({ status: "pending", last_inbound_at: newTimestamp })
        .eq("id", conversation.id);
    }
  }

  return true;
}

export type ClassifyBatchResult = { processed: number; remaining: number };

// Se llama repetidas veces desde el cliente (BackfillButton) hasta que
// remaining llega a 0. "remaining" se calcula restando el batch del total
// ANTES de clasificar, no volviendo a contar sin_clasificar después —
// así el contador baja siempre, aunque algún mensaje puntual falle la
// clasificación (queda sin_clasificar, visible para "Regenerar" manual
// más tarde, pero no hace que el loop del cliente se cuelgue reintentando
// el mismo lote para siempre).
export async function runBackfillClassifyBatch(admin: AdminClient): Promise<ClassifyBatchResult> {
  const { data: pending, count } = await admin
    .from("social_conversations")
    .select("id", { count: "exact" })
    .eq("classification", "sin_clasificar")
    .eq("status", "pending")
    .not("last_inbound_at", "is", null)
    .order("last_inbound_at", { ascending: true })
    .limit(CLASSIFY_BATCH_SIZE)
    .returns<{ id: number }[]>();

  const batch = pending ?? [];

  for (const row of batch) {
    const { data: lastInbound } = await admin
      .from("social_messages")
      .select("id")
      .eq("conversation_id", row.id)
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (lastInbound) {
      await classifyAndDraft(admin, row.id, lastInbound.id);
    }
  }

  return { processed: batch.length, remaining: Math.max(0, (count ?? 0) - batch.length) };
}
