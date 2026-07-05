-- Fase 1: tabla de zonas de Mendoza (lista fija, administrable a futuro)

create table if not exists public.zones (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true
);

alter table public.zones enable row level security;

create policy "Zones are publicly readable"
on public.zones
for select
to anon, authenticated
using (true);

insert into public.zones (name, active) values
  ('Ciudad de Mendoza', true),
  ('Godoy Cruz', true),
  ('Guaymallén', true),
  ('Luján de Cuyo', true),
  ('Maipú', true),
  ('Las Heras', true),
  ('San Rafael', true)
on conflict (name) do nothing;
