// Tipos mínimos del payload de webhooks de Instagram (Meta) — solo los
// campos que el pipeline de ingesta realmente lee. El resto de cada
// entrada se guarda tal cual en social_messages.raw_payload (jsonb) para
// no perder información ni tener que mantener un tipo espejo de toda la
// API de Meta.

export type MetaWebhookPayload = {
  object?: string;
  entry?: MetaWebhookEntry[];
};

export type MetaWebhookEntry = {
  id?: string;
  time?: number;
  // DMs — Instagram Messaging.
  messaging?: MetaMessagingEvent[];
  // Comentarios — mismo formato "changes" que el resto de la Graph API.
  changes?: MetaChangeEvent[];
};

export type MetaMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
};

export type MetaChangeEvent = {
  field?: string;
  value?: MetaCommentValue;
};

export type MetaCommentValue = {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
  parent_id?: string;
};
