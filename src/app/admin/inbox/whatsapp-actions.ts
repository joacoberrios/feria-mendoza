"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsappTextMessage } from "@/lib/whatsapp/whatsapp-api";
import { requireAdmin, fail } from "./shared";

// REGLA INVIOLABLE: única función de todo el módulo de WhatsApp que
// termina en un envío real — corre detrás de requireAdmin() y del
// submit explícito del form de /admin/inbox.
export async function approveWhatsappReply(formData: FormData) {
  const profile = await requireAdmin();

  // draft_id es OPCIONAL: si no hay ANTHROPIC_API_KEY configurada (o la
  // clasificación falló) no existe ningún reply_draft para esta
  // conversación, y el admin puede/debe poder escribir la respuesta a
  // mano igual — la IA es una ayuda, no un requisito del flujo.
  const draftIdRaw = formData.get("draft_id");
  const draftId =
    draftIdRaw !== null && Number.isFinite(Number(draftIdRaw)) ? Number(draftIdRaw) : null;
  const conversationId = Number(formData.get("conversation_id"));
  const text = String(formData.get("draft_text") ?? "").trim();
  const waId = String(formData.get("wa_id") ?? "");

  if (!text) fail("El mensaje no puede estar vacío.");
  if (!Number.isFinite(conversationId)) fail("Faltan datos para enviar la respuesta.");
  if (!waId) fail("Falta el número de WhatsApp del contacto.");

  const supabase = await createClient();

  // Regla dura de ventana, validada acá — nunca confiar en lo que
  // renderizó la UI: puede haber pasado tiempo entre que se generó el
  // borrador (o se abrió la tarjeta) y se apretó "Aprobar".
  const { data: conversation } = await supabase
    .from("social_conversations")
    .select("free_window_expires_at")
    .eq("id", conversationId)
    .single<{ free_window_expires_at: string | null }>();

  const windowExpired =
    !conversation?.free_window_expires_at || new Date(conversation.free_window_expires_at) <= new Date();

  if (windowExpired) {
    await supabase
      .from("social_conversations")
      .update({ follow_up_status: "needs_follow_up" })
      .eq("id", conversationId);
    if (draftId !== null) {
      await supabase
        .from("reply_drafts")
        .update({ status: "send_failed", error_detail: "free_window_expired" })
        .eq("id", draftId);
    }
    fail("La ventana de 24hs expiró — este contacto pasó a Seguimientos y requiere plantilla.");
  }

  const sendResult = await sendWhatsappTextMessage(waId, text);

  if (!sendResult.ok) {
    if (draftId !== null) {
      await supabase
        .from("reply_drafts")
        .update({ status: "send_failed", error_detail: sendResult.error })
        .eq("id", draftId);
    }
    fail(sendResult.error);
  }

  const nowIso = new Date().toISOString();

  // Solo acá, tras una respuesta OK de la Cloud API, se registra el
  // mensaje saliente.
  await supabase.from("social_messages").insert({
    conversation_id: conversationId,
    direction: "out",
    kind: "dm",
    external_id: sendResult.wamid,
    text,
    raw_payload: {},
    sent_by: profile.id,
    wamid: sendResult.wamid,
    origin: "api",
    delivery_status: "pending",
  });

  // Si vino de un borrador de la IA, se marca como enviado — una
  // respuesta tipeada a mano no tiene reply_draft asociado, no hay nada
  // que marcar acá y no es un error.
  if (draftId !== null) {
    await supabase
      .from("reply_drafts")
      .update({ status: "approved_sent", approved_by: profile.id, approved_at: nowIso })
      .eq("id", draftId);
  }

  await supabase
    .from("social_conversations")
    .update({ status: "replied", business_last_message_at: nowIso })
    .eq("id", conversationId);

  redirect("/admin/inbox?sent=1");
}

export async function discardWhatsappDraft(formData: FormData) {
  await requireAdmin();
  const draftId = Number(formData.get("draft_id"));
  const conversationId = Number(formData.get("conversation_id"));
  if (!Number.isFinite(draftId) || !Number.isFinite(conversationId)) fail("Datos inválidos.");

  const supabase = await createClient();
  await supabase.from("reply_drafts").update({ status: "discarded" }).eq("id", draftId);
  await supabase.from("social_conversations").update({ status: "discarded" }).eq("id", conversationId);

  redirect("/admin/inbox?discarded=1");
}
