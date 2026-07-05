-- Fix: guard_users_update() solo debe bloquear cambios de `role` /
-- `verification_status` cuando la query corre como rol de Postgres
-- 'authenticated' (un usuario común de la app, autenticado vía PostgREST).
--
-- PostgREST hace `SET LOCAL ROLE <rol>` en cada request según el JWT
-- (anon / authenticated / service_role). current_setting('role', true)
-- devuelve el rol de Postgres realmente vigente en la transacción, así que
-- distingue de forma confiable "vino de la API con sesión de usuario común"
-- de cualquier otro contexto: Table Editor / SQL Editor del dashboard
-- (corre como 'postgres') u operaciones con la service_role key
-- (corre como 'service_role'). En esos casos el trigger ahora deja pasar
-- el cambio sin pisarlo.
--
-- No hace falta recrear el trigger: ya apunta a esta función, así que
-- CREATE OR REPLACE FUNCTION alcanza para cambiar el comportamiento.

create or replace function public.guard_users_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role', true) is distinct from 'authenticated' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- un usuario común nunca puede cambiar su propio rol
  new.role := old.role;

  -- ni forzar su verification_status a algo distinto de 'pending'
  if new.verification_status is distinct from old.verification_status
     and new.verification_status <> 'pending' then
    new.verification_status := old.verification_status;
  end if;

  return new;
end;
$$;
