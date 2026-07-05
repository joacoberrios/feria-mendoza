-- Fase 2: tabla de productos.
--
-- plan_id queda sin FK todavía: la tabla publication_plans no existe hasta
-- Fase 3, ahí se agrega la constraint con ALTER TABLE.
--
-- El enum de status ya incluye 'pending_payment' (se usa recién en Fase 3,
-- cuando exista el flujo de pago) para no tener que alterar el tipo después.

do $$ begin
  create type public.product_condition as enum ('nuevo', 'como_nuevo', 'usado');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.product_status as enum (
    'draft', 'pending_payment', 'active', 'paused', 'sold', 'removed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.products (
  id bigint generated always as identity primary key,
  seller_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text not null,
  price numeric(12, 2) not null check (price >= 0),
  category_id bigint not null references public.categories (id),
  zone_id bigint not null references public.zones (id),
  condition public.product_condition not null,
  status public.product_status not null default 'draft',
  plan_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_seller_id_idx on public.products (seller_id);
