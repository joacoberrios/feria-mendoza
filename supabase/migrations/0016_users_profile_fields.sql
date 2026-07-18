-- Fase F: perfil público del vendedor (username + foto de perfil), visible
-- en catálogo y detalle de producto para cualquier usuario, no solo el
-- dueño de la fila.

alter table public.users
  add column if not exists username text,
  add column if not exists avatar_url text;

alter table public.users
  add constraint users_username_format
  check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Unicidad case-insensitive ("Juan" y "juan" no pueden coexistir).
-- Parcial (where username is not null) porque la columna es nullable
-- para usuarios existentes que todavía no eligieron uno.
create unique index if not exists users_username_lower_key
  on public.users (lower(username))
  where username is not null;

-- La RLS de public.users (0003_users_rls.sql) solo deja ver la fila propia
-- (o al admin, todas) — correcto para email/teléfono/DNI, pero username y
-- avatar_url tienen que ser visibles para cualquiera desde el catálogo y
-- el detalle de producto. Una vista corre con los privilegios de quien la
-- crea, no de quien la consulta, así que ignora la RLS de la tabla base:
-- patrón estándar de Supabase para exponer columnas públicas de una tabla
-- con RLS restrictiva.
create or replace view public.seller_public_profiles as
  select id, username, avatar_url
  from public.users;

grant select on public.seller_public_profiles to anon, authenticated;
