-- Snapshot del producto al momento de la compra.
-- Columnas nullable y aditivas — no toca datos existentes.

alter table public.orders
  add column product_title      text,
  add column product_photo_path text;

-- Backfill retroactivo: solo donde el producto aún existe.
-- Las órdenes cuyo producto ya fue borrado quedan con NULL
-- y siguen mostrando "Producto eliminado" — comportamiento correcto.
update public.orders o
set
  product_title      = p.title,
  product_photo_path = pp.storage_path
from public.products p
left join public.product_photos pp
  on pp.product_id = p.id and pp.is_primary = true
where o.product_id = p.id
  and o.product_title is null;
