-- Fase 1: Row Level Security de public.users
-- - Cada usuario ve/edita su propia fila.
-- - Admin (role='admin') ve y edita todas.
-- - Un usuario común no puede auto-promoverse a admin ni auto-aprobar su
--   verificación: solo puede llevar verification_status a 'pending'
--   (lo hace la página de subida de DNI).

alter table public.users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Users can view own profile"
on public.users for select
to authenticated
using (auth.uid() = id);

create policy "Admins can view all profiles"
on public.users for select
to authenticated
using (public.is_admin());

create policy "Users can update own profile"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can update any profile"
on public.users for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.guard_users_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists guard_users_update on public.users;
create trigger guard_users_update
  before update on public.users
  for each row execute function public.guard_users_update();
