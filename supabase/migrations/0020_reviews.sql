-- Fase I: reseñas de vendedor y reputación.
--
-- Reglas de negocio:
--   - Una reseña por orden (UNIQUE en order_id).
--   - Solo el comprador de una orden confirmada puede reseñar.
--   - El comprador puede editar rating/comment; el vendedor puede agregar
--     seller_response. Cada uno solo toca su parte — mismo patrón que
--     guard_users_update (0003/0005): el trigger silenciosamente resetea
--     los campos que el actor NO tiene permiso de modificar.

-- ──────────────────────────────────────────────────────
-- Tabla reviews
-- ──────────────────────────────────────────────────────

create table public.reviews (
  id           bigint generated always as identity primary key,
  order_id     bigint not null unique references public.orders (id),
  reviewer_id  uuid   not null references public.users (id),
  seller_id    uuid   not null references public.users (id),
  rating       int    not null check (rating between 1 and 5),
  comment      text,
  seller_response text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index reviews_seller_id_idx on public.reviews (seller_id);
create index reviews_reviewer_id_idx on public.reviews (reviewer_id);

-- ──────────────────────────────────────────────────────
-- Trigger: protección por columna (mismo patrón que guard_users_update)
-- ──────────────────────────────────────────────────────

create or replace function public.guard_reviews_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Siempre actualizar updated_at.
  new.updated_at := now();

  -- Las columnas de identidad y created_at son inmutables.
  new.order_id     := old.order_id;
  new.reviewer_id  := old.reviewer_id;
  new.seller_id    := old.seller_id;
  new.created_at   := old.created_at;

  if auth.uid() = old.reviewer_id and auth.uid() <> old.seller_id then
    -- Comprador: puede cambiar rating y comment, nunca seller_response.
    new.seller_response := old.seller_response;
  elsif auth.uid() = old.seller_id then
    -- Vendedor: puede cambiar seller_response, nunca rating ni comment.
    new.rating   := old.rating;
    new.comment  := old.comment;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_reviews_update on public.reviews;
create trigger guard_reviews_update
  before update on public.reviews
  for each row execute function public.guard_reviews_update();

-- ──────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────

alter table public.reviews enable row level security;

-- Lectura pública.
create policy "Reviews are publicly readable"
on public.reviews for select
using (true);

-- Insert: solo el comprador de una orden confirmada, y solo una vez
-- (el UNIQUE lo garantiza a nivel de base de datos también).
create policy "Buyers can review confirmed purchases"
on public.reviews for insert
to authenticated
with check (
  auth.uid() = reviewer_id
  and exists (
    select 1 from public.orders o
    where o.id     = order_id
      and o.buyer_id  = auth.uid()
      and o.seller_id = seller_id
      and o.status in ('paid', 'delivered', 'disputed', 'resolved')
  )
);

-- Update: comprador O vendedor pueden actualizar; el trigger define qué
-- columna puede tocar cada uno.
create policy "Reviewer and seller can update review"
on public.reviews for update
to authenticated
using  (auth.uid() = reviewer_id or auth.uid() = seller_id)
with check (auth.uid() = reviewer_id or auth.uid() = seller_id);

-- ──────────────────────────────────────────────────────
-- Vista seller_reputation
-- Sigue el patrón de seller_public_profiles (0016): la vista es propiedad
-- del rol postgres (bypassrls), así puede agregar datos de múltiples filas
-- de users sin quedar atrapada por el RLS de "solo tu propia fila".
-- ──────────────────────────────────────────────────────

create or replace view public.seller_reputation as
select
  u.id as seller_id,
  coalesce(s.confirmed_sales, 0) as confirmed_sales,
  coalesce(r.review_count, 0)    as review_count,
  r.avg_rating
from public.users u
left join (
  select seller_id, count(*) as confirmed_sales
  from public.orders
  where status in ('paid', 'delivered', 'resolved')
  group by seller_id
) s on s.seller_id = u.id
left join (
  select
    seller_id,
    count(*)                            as review_count,
    round(avg(rating)::numeric, 1)      as avg_rating
  from public.reviews
  group by seller_id
) r on r.seller_id = u.id;

grant select on public.seller_reputation to anon, authenticated;
