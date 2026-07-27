-- Fase 6: registro manual de ventas del Plan Instagram.
-- El vendedor puede no tener cuenta en la plataforma (trato directo por
-- WhatsApp), por eso seller_name y seller_contact son texto libre sin FK.

create table public.instagram_sales (
  id              bigint generated always as identity primary key,
  seller_name     text not null,
  seller_contact  text not null,
  plan_id         bigint not null references public.publication_plans (id),
  amount          numeric(12, 2) not null,
  notes           text,
  registered_by   uuid not null references public.users (id),
  created_at      timestamptz not null default now()
);

alter table public.instagram_sales enable row level security;

-- Solo admin puede leer y escribir — no es información pública ni del vendedor.
create policy "Admins can select instagram_sales"
  on public.instagram_sales for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert instagram_sales"
  on public.instagram_sales for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can delete instagram_sales"
  on public.instagram_sales for delete
  to authenticated
  using (public.is_admin());
