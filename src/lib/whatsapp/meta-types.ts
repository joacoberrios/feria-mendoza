// Tipos mínimos del payload de webhooks de WhatsApp Cloud API — solo los
// campos que el pipeline de ingesta realmente lee. El resto se guarda
// tal cual en social_messages.raw_payload (jsonb).
//
// Verificado contra la documentación oficial de Meta (no de memoria):
// - Mensajes/estados entrantes viajan con field="messages" en el mismo
//   "change", pero en value.messages[] o value.statuses[] según el caso.
// - Los echoes de Coexistence (mensajes mandados a mano desde la app del
//   teléfono) viajan en un field SEPARADO, "smb_message_echoes", con
//   value.message_echoes[] — no vienen mezclados en "messages".
//   https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppEntry[];
};

export type WhatsAppEntry = {
  id?: string;
  changes?: WhatsAppChange[];
};

export type WhatsAppChange = {
  field?: string; // "messages" | "smb_message_echoes" | otros que se ignoran
  value?: WhatsAppChangeValue;
};

export type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: WhatsAppInboundMessage[];
  statuses?: WhatsAppStatus[];
  message_echoes?: WhatsAppEcho[];
};

export type WhatsAppInboundMessage = {
  from?: string; // wa_id de quien escribe
  id?: string; // wamid
  timestamp?: string; // epoch segundos, string
  type?: string; // "text" | "image" | "audio" | "video" | "document" | "sticker" | ...
  text?: { body?: string };
};

export type WhatsAppStatus = {
  id?: string; // wamid del mensaje saliente
  status?: string; // "sent" | "delivered" | "read" | "failed"
  timestamp?: string;
  recipient_id?: string;
  errors?: { code?: number; title?: string; message?: string }[];
};

export type WhatsAppEcho = {
  from?: string; // número del negocio
  to?: string; // wa_id del cliente
  id?: string; // wamid
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};
