// Llamadas a la Cloud API de WhatsApp — un solo lugar, mismo espíritu
// que src/lib/inbox/instagram-api.ts. A diferencia de Instagram, el
// token es permanente (system user) y vive en una env var
// (WHATSAPP_ACCESS_TOKEN), no rota, así que no hace falta leerlo de la
// DB ni pasar un cliente de Supabase acá.

const GRAPH_API_BASE = "https://graph.facebook.com/v23.0";

export type SendResult =
  | { ok: true; wamid: string; dryRun?: true }
  | { ok: false; error: string };

function isDryRun(): boolean {
  return process.env.INBOX_DRY_RUN === "true";
}

// Confirmado empíricamente contra la Graph API real: Meta identifica a
// los contactos argentinos con el "9" de celular (5492616637057, lo que
// llega en los webhooks entrantes y lo que devuelve como wa_id
// canónico), pero el campo "to" al ENVIAR rechaza ese mismo formato
// (#131030) — hay que sacarle el 9 justo ahí. Es un comportamiento
// puntual de Meta para Argentina, no un bug nuestro; se aísla acá para
// no tener que acordarse de esto en cada lugar que arma un envío.
function toGraphApiRecipient(waId: string): string {
  if (waId.startsWith("549") && waId.length === 13) {
    return "54" + waId.slice(3);
  }
  return waId;
}

// Ante 429 no reintenta — mismo criterio que Instagram: un reintento
// automático podría duplicar un envío si la respuesta se perdió pero el
// mensaje sí había salido.
export async function sendWhatsappTextMessage(waId: string, text: string): Promise<SendResult> {
  const to = toGraphApiRecipient(waId);

  if (isDryRun()) {
    console.log(`[whatsapp-api] DRY RUN, no se envía de verdad → to=${to}`, JSON.stringify({ text }));
    return { ok: true, wamid: `dry-run-${Date.now()}`, dryRun: true };
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
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (res.status === 429) {
      return { ok: false, error: "WhatsApp devolvió 429 (límite de uso) — probá de nuevo más tarde." };
    }

    const json = (await res.json().catch(() => null)) as
      | {
          messages?: { id?: string }[];
          error?: { message?: string; error_data?: { details?: string } };
        }
      | null;

    if (!res.ok) {
      // error_data.details trae la explicación en español de Meta
      // (ej. "agregá el número a la lista de destinatarios") — más
      // accionable que el message crudo en inglés cuando está.
      const detail = json?.error?.error_data?.details;
      const message = json?.error?.message ?? `Error ${res.status} de la Cloud API`;
      return { ok: false, error: detail ? `${message} — ${detail}` : message };
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
