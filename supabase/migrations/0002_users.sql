-- Fase 1: tabla de perfil de usuario (public.users), separada de auth.users
-- (que administra Supabase Auth). Se crea automáticamente una fila acá
-- cada vez que alguien se registra.

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status_enum as enum (
    'not_submitted', 'pending', 'approved', 'rejected'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  zone_id bigint references public.zones (id),
  role public.user_role not null default 'user',
  verification_status public.verification_status_enum not null default 'not_submitted',
  dni_photo_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
