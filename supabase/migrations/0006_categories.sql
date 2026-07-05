-- Fase 2: categorías de producto (lista fija, administrable a futuro)

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true
);

alter table public.categories enable row level security;

create policy "Categories are publicly readable"
on public.categories
for select
to anon, authenticated
using (true);

insert into public.categories (name, active) values
  ('Ropa', true),
  ('Electrodomésticos', true),
  ('Muebles', true),
  ('Electrónica', true),
  ('Hogar y Jardín', true),
  ('Deportes', true),
  ('Juguetes', true),
  ('Herramientas', true),
  ('Otros', true)
on conflict (name) do nothing;
