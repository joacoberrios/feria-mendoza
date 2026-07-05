-- Fase 3: planes de publicación.
--
-- Web: 100% comisión, publicar es gratis y sin límite de productos (el
-- split real de Mercado Pago se ejecuta recién en Fase 4). Instagram: fee
-- fijo, 100% manual/externo (se registra en instagram_sales, sin
-- integración técnica).

do $$ begin
  create type public.plan_type as enum ('commission', 'fixed_fee');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.plan_channel as enum ('web', 'instagram');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.publication_plans (
  id bigint generated always as identity primary key,
  name text not null unique,
  type public.plan_type not null,
  price numeric(12, 2),
  duration_days integer,
  max_active_listings integer,
  max_photos integer,
  commission_percentage numeric(5, 2),
  channel public.plan_channel not null,
  active boolean not null default true
);

insert into public.publication_plans
  (name, type, price, duration_days, max_active_listings, max_photos, commission_percentage, channel, active)
values
  ('Plan Comisión Web', 'commission', null, null, null, null, 20, 'web', true),
  ('Historias Destacadas IG', 'fixed_fee', 10000, 30, null, 10, null, 'instagram', true)
on conflict (name) do nothing;

-- products.plan_id existe desde Fase 2 sin FK (publication_plans no
-- existía todavía). La agregamos ahora.
alter table public.products
  add constraint products_plan_id_fkey
  foreign key (plan_id) references public.publication_plans (id);

alter table public.publication_plans enable row level security;

create policy "Active plans are publicly readable"
on public.publication_plans for select
to anon, authenticated
using (active = true);

create policy "Admins can view all plans"
on public.publication_plans for select
to authenticated
using (public.is_admin());

create policy "Admins can update plans"
on public.publication_plans for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
