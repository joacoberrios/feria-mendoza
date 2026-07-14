import type { SupabaseClient } from "@supabase/supabase-js";

// Todas las llamadas a la Graph API de Instagram pasan por acá — un solo
// lugar para manejar el token, rate limits (429) y errores.

const GRAPH_API_BASE = "https://graph.instagram.com/v23.0";

type AdminClient = SupabaseClient;

// El access token vive en social_settings (rota cada 60 días, ver
// docs/inbox-setup.md) — nunca en env vars ni en el cliente.
export async function getIgAccessToken(admin: AdminClient): Promise<string | null> {
  const { data } = await admin
    .from("social_settings")
    .select("ig_access_token")
    .eq("id", 1)
    .maybeSingle<{ ig_access_token: string | null }>();

  return data?.ig_access_token ?? null;
}

// Trae el caption de una publicación para dar contexto a la
// clasificación de un comentario. Falla en silencio (devuelve null) ante
// cualquier error — la clasificación tiene que poder seguir sin esto,
// nunca bloquear ni perder el mensaje por un caption que no se pudo traer.
export async function getMediaCaption(admin: AdminClient, mediaId: string): Promise<string | null> {
  try {
    const token = await getIgAccessToken(admin);
    if (!token) return null;

    const url = new URL(`${GRAPH_API_BASE}/${mediaId}`);
    url.searchParams.set("fields", "caption");
    url.searchParams.set("access_token", token);

    const res = await fetch(url, { method: "GET" });

    if (res.status === 429) {
      console.error("[instagram-api] rate limit al pedir el caption de", mediaId);
      return null;
    }

    if (!res.ok) {
      console.error("[instagram-api] error trayendo caption:", res.status, await res.text());
      return null;
    }

    const body = (await res.json()) as { caption?: string };
    return body.caption ?? null;
  } catch (err) {
    console.error("[instagram-api] excepción trayendo caption:", err);
    return null;
  }
}

export type SendResult = { ok: true; externalId: string } | { ok: false; error: string };

function isDryRun(): boolean {
  return process.env.INBOX_DRY_RUN === "true";
}

// En dry run no hace falta tener nada de Meta configurado todavía (ni
// IG_USER_ID ni el token) — la gracia es poder probar el flujo de
// aprobación de punta a punta antes de terminar el setup real.
function requireIgUserId(): string | null {
  const igUserId = process.env.IG_USER_ID;
  if (igUserId) return igUserId;
  return isDryRun() ? "dry-run-ig-user-id" : null;
}

// Único punto donde se arma y manda el POST — dry run acá, no en cada
// llamador. Ante 429 devuelve el error tal cual, sin reintentar: un
// reintento automático en loop podría mandar el mismo mensaje más de
// una vez si el primer intento sí había llegado a procesarse del lado
// de Meta antes de que la respuesta se perdiera.
async function graphPost(
  admin: AdminClient,
  path: string,
  body: Record<string, unknown>,
): Promise<SendResult> {
  if (isDryRun()) {
    console.log(`[instagram-api] DRY RUN, no se envía de verdad → POST ${path}`, JSON.stringify(body));
    return { ok: true, externalId: `dry-run-${Date.now()}` };
  }

  const token = await getIgAccessToken(admin);
  if (!token) {
    return { ok: false, error: "No hay un access token de Instagram configurado (social_settings)." };
  }

  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      return { ok: false, error: "Instagram devolvió 429 (límite de uso) — probá de nuevo más tarde." };
    }

    const json = (await res.json().catch(() => null)) as
      | { id?: string; message_id?: string; error?: { message?: string } }
      | null;

    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? `Error ${res.status} de la Graph API` };
    }

    return { ok: true, externalId: json?.message_id ?? json?.id ?? `sent-${Date.now()}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red enviando el mensaje" };
  }
}

// DM directo — si pasaron más de 24h desde el último mensaje del
// contacto hay que mandar tag: HUMAN_AGENT (válido hasta 7 días desde
// ese último mensaje) o Meta lo rechaza.
export async function sendDirectMessage(
  admin: AdminClient,
  recipientIgsid: string,
  text: string,
  opts?: { useHumanAgentTag?: boolean },
): Promise<SendResult> {
  const igUserId = requireIgUserId();
  if (!igUserId) return { ok: false, error: "Falta IG_USER_ID en las variables de entorno." };

  const body: Record<string, unknown> = { recipient: { id: recipientIgsid }, message: { text } };
  if (opts?.useHumanAgentTag) body.tag = "HUMAN_AGENT";

  return graphPost(admin, `/${igUserId}/messages`, body);
}

// Respuesta privada a un comentario — mismo endpoint que el DM pero con
// recipient.comment_id. Solo se puede usar UNA vez por comentario y
// dentro de los 7 días de hecho (la UI se encarga de no ofrecer esta
// opción fuera de esa ventana / si ya se usó).
export async function sendPrivateReplyToComment(
  admin: AdminClient,
  commentId: string,
  text: string,
): Promise<SendResult> {
  const igUserId = requireIgUserId();
  if (!igUserId) return { ok: false, error: "Falta IG_USER_ID en las variables de entorno." };

  return graphPost(admin, `/${igUserId}/messages`, {
    recipient: { comment_id: commentId },
    message: { text },
  });
}

// Respuesta pública a un comentario (queda como otro comentario, visible
// para todos).
export async function sendPublicReplyToComment(
  admin: AdminClient,
  commentId: string,
  text: string,
): Promise<SendResult> {
  return graphPost(admin, `/${commentId}/replies`, { message: text });
}
