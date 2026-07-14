import type { SupabaseClient } from "@supabase/supabase-js";

// Todas las llamadas a la Graph API de Instagram pasan por acá — un solo
// lugar para manejar el token, rate limits (429) y errores. Se va a ir
// completando en las próximas etapas (envío de DMs/respuestas, backfill,
// refresh de token); por ahora solo lo que necesita la clasificación.

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

export class InstagramRateLimitError extends Error {
  constructor() {
    super("Instagram Graph API rate limit (429)");
    this.name = "InstagramRateLimitError";
  }
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
