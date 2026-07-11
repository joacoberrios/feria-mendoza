-- Fase 4: campos de conexión OAuth de Mercado Pago del vendedor.
--
-- Estas columnas NUNCA deben ser legibles por el propio usuario vía la
-- API pública, ni siquiera siendo dueño de la fila (a diferencia del
-- resto de la tabla, donde el dueño se lee a sí mismo sin problema). RLS
-- de fila no alcanza para esto (es row-level, no column-level), así que
-- se revoca el SELECT de estas columnas puntuales para anon/authenticated
-- a nivel de columna. Solo el cliente con la service_role key
-- (src/lib/supabase/admin.ts) puede leerlas/escribirlas — ese cliente
-- bypassea RLS y grants por ser el dueño/rol privilegiado de la tabla.

alter table public.users
  add column if not exists mp_access_token text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_token_expires_at timestamptz,
  add column if not exists mp_user_id text;

revoke select (mp_access_token, mp_refresh_token, mp_token_expires_at, mp_user_id)
  on public.users
  from anon, authenticated;
