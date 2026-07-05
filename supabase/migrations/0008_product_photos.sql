-- Fase 2: fotos de producto en tabla separada (en vez de array/jsonb en
-- products) para poder marcar la principal y borrar una foto puntual sin
-- tener que parsear/reescribir un array completo.
--
-- Dos garantías pedidas:
-- 1. Máximo 5 fotos por producto (trigger, un unique index no alcanza para
--    contar filas).
-- 2. Una sola foto principal por producto (unique index parcial, alcanza
--    sin necesidad de trigger).

create table if not exists public.product_photos (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  storage_path text not null,
  is_primary boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_photos_product_id_idx
  on public.product_photos (product_id);

create or replace function public.enforce_max_product_photos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.product_photos
    where product_id = new.product_id
  ) >= 5 then
    raise exception 'Un producto no puede tener más de 5 fotos';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_max_product_photos on public.product_photos;
create trigger enforce_max_product_photos
  before insert on public.product_photos
  for each row execute function public.enforce_max_product_photos();

create unique index if not exists product_photos_one_primary_per_product
on public.product_photos (product_id)
where is_primary;
