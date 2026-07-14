"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { classifyAndDraft } from "@/lib/inbox/classify";
import {
  sendDirectMessage,
  sendPrivateReplyToComment,
  sendPublicReplyToComment,
} from "@/lib/inbox/instagram-api";
import { getDmWindowStatus, getCommentPrivateReplyWindow } from "@/lib/inbox/reply-window";
import type { SocialMessageKind } from "@/types/database";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}

function fail(message: string): never {
  redirect(`/admin/inbox?error=${encodeURIComponent(message)}`);
}

// REGLA INVIOLABLE: esta es la ÚNICA función de todo el módulo que
// termina en una llamada real de envío a Instagram, y solo corre detrás
// de requireAdmin() + el submit explícito de este form. No hay ningún
// otro code path (clasificación, backfill, cron) que llegue a mandar un
// mensaje.
export async function approveAndSend(formData: FormData) {
  const profile = await requireAdmin();

  const draftId = Number(formData.get("draft_id"));
  const conversationId = Number(formData.get("conversation_id"));
  const text = String(formData.get("draft_text") ?? "").trim();
  const replyMode = String(formData.get("reply_mode") ?? "dm") as
    | "dm"
    | "private_reply"
    | "public_reply";
  // Precalculados al renderizar la tarjeta — evita otra vuelta a la DB acá.
  const contactExternalId = String(formData.get("contact_external_id") ?? "");
  const commentExternalId = String(formData.get("comment_external_id") ?? "");
  const lastInboundAt = formData.get("last_inbound_at")
    ? String(formData.get("last_inbound_at"))
    : null;
  const platform = String(formData.get("platform") ?? "instagram");

  if (!text) fail("El mensaje no puede estar vacío.");
  if (!Number.isFinite(draftId) || !Number.isFinite(conversationId)) {
    fail("Faltan datos para enviar la respuesta.");
  }
  // Esta función solo sabe hablar con la Graph API de Instagram — el
  // envío de WhatsApp tiene su propio server action (approveWhatsappReply,
  // Etapa 2 del módulo de WhatsApp). Sin esta guarda, un borrador de
  // WhatsApp regenerado por error terminaría intentando mandarse por acá.
  if (platform !== "instagram") {
    fail("Esta conversación no es de Instagram — usá la acción de WhatsApp para responderla.");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  let sendResult;
  let kind: SocialMessageKind;

  if (replyMode === "dm") {
    const window = getDmWindowStatus(lastInboundAt);
    if (window.kind === "expired") {
      fail("Pasaron más de 7 días del último mensaje: Instagram ya no permite responder este DM. Archivalo.");
    }
    if (!contactExternalId) fail("Falta el ID de Instagram del contacto.");

    sendResult = await sendDirectMessage(admin, contactExternalId, text, {
      useHumanAgentTag: window.kind === "human_agent_tag",
    });
    kind = "dm";
  } else if (replyMode === "private_reply") {
    if (!getCommentPrivateReplyWindow(lastInboundAt).available) {
      fail("Pasaron más de 7 días del comentario: la respuesta privada ya no está disponible.");
    }
    if (!commentExternalId) fail("Falta el ID del comentario.");

    sendResult = await sendPrivateReplyToComment(admin, commentExternalId, text);
    kind = "private_reply";
  } else {
    if (!commentExternalId) fail("Falta el ID del comentario.");

    sendResult = await sendPublicReplyToComment(admin, commentExternalId, text);
    kind = "comment_reply";
  }

  if (!sendResult.ok) {
    await supabase
      .from("reply_drafts")
      .update({ status: "send_failed", error_detail: sendResult.error })
      .eq("id", draftId);
    fail(sendResult.error);
  }

  // Solo acá, tras una respuesta OK de la API, se registra el mensaje
  // saliente y se marca el draft como enviado — con approved_by seteado
  // siempre (lo exige también el CHECK de la policy de UPDATE).
  await supabase.from("social_messages").insert({
    conversation_id: conversationId,
    direction: "out",
    kind,
    external_id: sendResult.externalId,
    text,
    raw_payload: {},
    sent_by: profile.id,
  });

  await supabase
    .from("reply_drafts")
    .update({ status: "approved_sent", approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", draftId);

  await supabase.from("social_conversations").update({ status: "replied" }).eq("id", conversationId);

  redirect("/admin/inbox?sent=1");
}

export async function regenerateDraft(formData: FormData) {
  await requireAdmin();
  const conversationId = Number(formData.get("conversation_id"));
  if (!Number.isFinite(conversationId)) fail("Conversación inválida.");

  const supabase = await createClient();
  const { data: lastInbound } = await supabase
    .from("social_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("direction", "in")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (!lastInbound) fail("No hay ningún mensaje entrante para volver a clasificar.");

  const admin = createAdminClient();
  await classifyAndDraft(admin, conversationId, lastInbound.id);

  redirect("/admin/inbox?regenerated=1");
}

export async function discardDraft(formData: FormData) {
  await requireAdmin();
  const draftId = Number(formData.get("draft_id"));
  const conversationId = Number(formData.get("conversation_id"));
  if (!Number.isFinite(draftId) || !Number.isFinite(conversationId)) fail("Datos inválidos.");

  const supabase = await createClient();
  await supabase.from("reply_drafts").update({ status: "discarded" }).eq("id", draftId);
  await supabase.from("social_conversations").update({ status: "discarded" }).eq("id", conversationId);

  redirect("/admin/inbox?discarded=1");
}

export async function archiveConversation(formData: FormData) {
  await requireAdmin();
  const conversationId = Number(formData.get("conversation_id"));
  if (!Number.isFinite(conversationId)) fail("Conversación inválida.");

  const supabase = await createClient();
  await supabase.from("social_conversations").update({ status: "archived" }).eq("id", conversationId);

  redirect("/admin/inbox?archived=1");
}
