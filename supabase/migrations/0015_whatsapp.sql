-- Extiende el inbox social (migración 0014) para soportar WhatsApp Cloud
-- API con Coexistence, reusando social_contacts/social_conversations/
-- social_messages/reply_drafts en vez de tablas nuevas — solo se agregan
-- las columnas específicas de WhatsApp (el resto queda NULL/default para
-- filas de Instagram, igual que ig_media_id/ig_media_caption quedan NULL
-- para WhatsApp).
--
-- 'whatsapp' ya estaba en el enum social_platform desde la 0014
-- (se dejó pensado para esto), así que no hace falta ALTER TYPE ahí.
-- 'kind' de conversación usa 'dm' para WhatsApp también — no hay
-- concepto de "comentario", todo es un hilo continuo por contacto (el
-- mismo índice único parcial de la 0014 que ya obliga una sola
-- conversación 'dm' por contacto sirve tal cual).
--
-- No hace falta ninguna policy de RLS nueva: las policies de UPDATE de
-- social_conversations/reply_drafts de la 0014 ya son "using(is_admin())
-- with check(is_admin())" sin restricción de columna, así que ya cubren
-- las columnas nuevas. El webhook de WhatsApp escribe con el cliente de
-- service role, igual que el de Instagram.

do $$ begin
  create type public.wa_follow_up_status as enum (
    'none', 'needs_follow_up', 'follow_up_suggested', 'follow_up_sent', 'dismissed'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.wa_message_origin as enum ('customer', 'api', 'phone_app');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.wa_delivery_status as enum ('pending', 'sent', 'delivered', 'read', 'failed');
exception
  when duplicate_object then null;
end $$;

-- ============================================================ social_contacts

-- wa_id queda redundante con external_id a propósito (external_id sigue
-- siendo lo que usa el pipeline de ingesta genérico compartido con
-- Instagram, not null); wa_id es la columna con nombre claro que usa el
-- código específico de WhatsApp (armar el "to" de la Cloud API, etc.),
-- para no tener que acordarse de que "external_id" es el wa_id acá.
alter table public.social_contacts add column if not exists wa_id text;
alter table public.social_contacts add column if not exists phone_display text;

create unique index if not exists social_contacts_wa_id_idx
  on public.social_contacts (platform, wa_id)
  where wa_id is not null;

-- ============================================================ social_conversations

alter table public.social_conversations add column if not exists customer_last_message_at timestamptz;
alter table public.social_conversations add column if not exists business_last_message_at timestamptz;
-- Se recalcula en cada mensaje entrante del cliente como
-- customer_last_message_at + 24h — vive como columna (no se calcula al
-- vuelo) para poder indexarla y para que el cron de seguimientos no
-- tenga que repetir la cuenta.
alter table public.social_conversations add column if not exists free_window_expires_at timestamptz;
alter table public.social_conversations add column if not exists follow_up_status public.wa_follow_up_status not null default 'none';

create index if not exists social_conversations_follow_up_status_idx
  on public.social_conversations (follow_up_status);
create index if not exists social_conversations_free_window_idx
  on public.social_conversations (free_window_expires_at);

-- ============================================================ social_messages

alter table public.social_messages add column if not exists wamid text;
alter table public.social_messages add column if not exists origin public.wa_message_origin not null default 'customer';
-- Solo aplica a salientes (direction='out') — se queda NULL en
-- entrantes y en todo lo de Instagram.
alter table public.social_messages add column if not exists delivery_status public.wa_delivery_status;
alter table public.social_messages add column if not exists delivery_error text;

create unique index if not exists social_messages_wamid_idx
  on public.social_messages (wamid)
  where wamid is not null;
