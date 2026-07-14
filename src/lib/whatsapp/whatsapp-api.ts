// Llamadas a la Cloud API de WhatsApp — un solo lugar, mismo espíritu
// que src/lib/inbox/instagram-api.ts. A diferencia de Instagram, el
// token es permanente (system user) y vive en una env var
// (WHATSAPP_ACCESS_TOKEN), no rota, así que no hace falta leerlo de la
// DB ni pasar un cliente de Supabase acá.

const GRAPH_API_BASE = "https://graph.facebook.com/v23.0";

export type SendResult = { ok: true; wamid: string } | { ok: false; error: string };

function isDryRun(): boolean {
  return process.env.INBOX_DRY_RUN === "true";
}

// Ante 429 no reintenta — mismo criterio que Instagram: un reintento
// automático podría duplicar un envío si la respuesta se perdió pero el
// mensaje sí había salido.
export async function sendWhatsappTextMessage(waId: string, text: string): Promise<SendResult> {
  if (isDryRun()) {
    console.log(`[whatsapp-api] DRY RUN, no se envía de verdad → to=${waId}`, JSON.stringify({ text }));
    return { ok: true, wamid: `dry-run-${Date.now()}` };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    return {
      ok: false,
      error: "Falta WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN en las variables de entorno.",
    };
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: waId,
        type: "text",
        text: { body: text },
      }),
    });

    if (res.status === 429) {
      return { ok: false, error: "WhatsApp devolvió 429 (límite de uso) — probá de nuevo más tarde." };
    }

    const json = (await res.json().catch(() => null)) as
      | { messages?: { id?: string }[]; error?: { message?: string } }
      | null;

    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? `Error ${res.status} de la Cloud API` };
    }

    const wamid = json?.messages?.[0]?.id;
    if (!wamid) {
      return { ok: false, error: "La Cloud API respondió OK pero sin id de mensaje." };
    }

    return { ok: true, wamid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red enviando el mensaje" };
  }
}
