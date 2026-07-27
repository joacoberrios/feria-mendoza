-- Fase: recupero de contraseña manual (sin email de verificación).
-- La contraseña pendiente solo es legible por el cliente admin (service_role);
-- anon/authenticated no pueden acceder a ella, ni siquiera si bypassean RLS,
-- porque el REVOKE es a nivel de columna (más fuerte que RLS en Postgres).

create table public.password_reset_requests (
  id               bigint generated always as identity primary key,
  user_id          uuid not null unique references public.users (id) on delete cascade,
  pending_password text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Mismo patrón que dni_number (0018): columna invisible para API normal.
revoke select (pending_password)
  on public.password_reset_requests
  from anon, authenticated;

create index password_reset_requests_user_id_idx
  on public.password_reset_requests (user_id);

alter table public.password_reset_requests enable row level security;

-- Admin puede ver las filas (pero pending_password sigue oculta por el REVOKE).
create policy "Admins can view password reset requests"
  on public.password_reset_requests for select
  to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Insert/update/delete solo via service_role (server actions con cliente admin).
-- Sin políticas adicionales → default deny para anon/authenticated.
