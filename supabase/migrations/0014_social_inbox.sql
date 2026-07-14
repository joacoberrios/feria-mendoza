-- Bandeja de mensajes de redes sociales (Instagram por ahora, WhatsApp a
-- futuro — las tablas ya modelan platform/kind genéricos para eso, pero
-- ningún código de esta fase implementa WhatsApp).
--
-- REGLA INVIOLABLE: ningún mensaje sale a Instagram sin que un admin
-- apruebe el texto exacto (ver reply_drafts.status y social_messages,
-- que solo se insertan como 'out' después de una respuesta OK de la API).
--
-- RLS: estas tablas son "solo-admin" — el único acceso vía el cliente
-- normal (cookies del usuario logueado) es para un admin, y ni así se le
-- da UPDATE/DELETE amplio: solo lo que las acciones de la bandeja
-- necesitan (aprobar/editar borrador, cambiar estado de conversación,
-- registrar el mensaje saliente ya enviado). El webhook y el cron
-- escriben con el cliente de service role (src/lib/supabase/admin.ts),
-- que bypassea RLS por completo, así que no necesitan policy propia.
--
-- social_settings guarda el access token de larga duración de Instagram
-- (rota cada 60 días) — a propósito NO tiene ninguna policy para
-- authenticated/anon, ni siquiera de solo lectura para admin: nadie lo
-- lee a través del cliente normal, solo el cron/servidor vía service role.

do $$ begin
  create type public.social_platform as enum ('instagram', 'whatsapp');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.social_conversation_kind as enum ('dm', 'comment');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.social_conversation_status as enum (
    'pending', 'replied', 'archived', 'discarded'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.social_classification as enum (
    'vendedor_potencial', 'comprador_interesado', 'consulta_general',
    'ruido', 'spam', 'sin_clasificar'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.social_direction as enum ('in', 'out');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.social_message_kind as enum (
    'dm', 'comment', 'comment_reply', 'private_reply'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.reply_draft_status as enum (
    'suggested', 'approved_sent', 'discarded', 'send_failed'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================ social_settings

create table if not exists public.social_settings (
  id bigint primary key default 1 check (id = 1),
  ig_access_token text,
  ig_token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.social_settings (id) values (1)
on conflict (id) do nothing;

alter table public.social_settings enable row level security;
-- Sin policies a propósito: ni admin lo lee/escribe vía el cliente normal.

-- ============================================================ social_contacts

create table if not exists public.social_contacts (
  id bigint generated always as identity primary key,
  platform public.social_platform not null,
  external_id text not null,
  username text,
  display_name text,
  interaction_count integer not null default 0 check (interaction_count >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (platform, external_id)
);

alter table public.social_contacts enable row level security;

create policy "Admins can view contacts"
on public.social_contacts for select
to authenticated
using (public.is_admin());

-- ============================================================ social_conversations

create table if not exists public.social_conversations (
  id bigint generated always as identity primary key,
  contact_id bigint not null references public.social_contacts (id) on delete cascade,
  platform public.social_platform not null,
  kind public.social_conversation_kind not null,
  ig_media_id text,
  ig_media_caption text,
  status public.social_conversation_status not null default 'pending',
  classification public.social_classification not null default 'sin_clasificar',
  classification_confidence numeric(4, 3) check (
    classification_confidence is null
    or (classification_confidence >= 0 and classification_confidence <= 1)
  ),
  priority_score integer not null default 0,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now()
);

-- Una sola conversación 'dm' por contacto (el hilo completo); los
-- comentarios sí pueden generar muchas conversaciones por contacto (una
-- por comentario). Permite upsert vía "on conflict (contact_id) where
-- kind = 'dm'" en la ingesta del webhook/backfill.
create unique index if not exists social_conversations_dm_per_contact_idx
  on public.social_conversations (contact_id)
  where kind = 'dm';

create index if not exists social_conversations_status_idx
  on public.social_conversations (status);
create index if not exists social_conversations_priority_idx
  on public.social_conversations (priority_score desc);
create index if not exists social_conversations_contact_id_idx
  on public.social_conversations (contact_id);

alter table public.social_conversations enable row level security;

create policy "Admins can view conversations"
on public.social_conversations for select
to authenticated
using (public.is_admin());

-- Cambiar status (archivar/descartar/marcar respondida) es lo único que
-- una acción de la bandeja hace directo sobre esta tabla con el cliente
-- normal; clasificación/priority_score los pone el pipeline de ingesta
-- (service role).
create policy "Admins can update conversation status"
on public.social_conversations for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================ social_messages

create table if not exists public.social_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.social_conversations (id) on delete cascade,
  direction public.social_direction not null,
  kind public.social_message_kind not null,
  external_id text not null unique,
  text text,
  raw_payload jsonb not null default '{}'::jsonb,
  sent_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index if not exists social_messages_conversation_id_idx
  on public.social_messages (conversation_id);

alter table public.social_messages enable row level security;

create policy "Admins can view messages"
on public.social_messages for select
to authenticated
using (public.is_admin());

-- Solo para registrar el mensaje saliente YA enviado con éxito por la
-- Graph API (ver checklist: "ningún envío sin approved_by"). direction
-- 'in' nunca se inserta acá con este cliente: eso lo hace el webhook con
-- service role.
create policy "Admins can record their own outbound messages"
on public.social_messages for insert
to authenticated
with check (
  public.is_admin()
  and direction = 'out'
  and sent_by = auth.uid()
);

-- ============================================================ reply_drafts

create table if not exists public.reply_drafts (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.social_conversations (id) on delete cascade,
  in_reply_to bigint references public.social_messages (id),
  draft_text text,
  status public.reply_draft_status not null default 'suggested',
  model text,
  error_detail text,
  approved_by uuid references public.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reply_drafts_conversation_id_idx
  on public.reply_drafts (conversation_id);

alter table public.reply_drafts enable row level security;

create policy "Admins can view drafts"
on public.reply_drafts for select
to authenticated
using (public.is_admin());

-- Cubre las 3 acciones de la bandeja sobre un borrador existente: editar
-- texto antes de enviar, marcar approved_sent/discarded/send_failed, y
-- regenerar (se pisa draft_text/model y vuelve a 'suggested'). Nunca se
-- puede setear approved_sent sin approved_by = el admin actual.
create policy "Admins can update drafts"
on public.reply_drafts for update
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and (status <> 'approved_sent' or approved_by = auth.uid())
);
