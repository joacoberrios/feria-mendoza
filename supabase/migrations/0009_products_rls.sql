-- Fase 2: RLS de products y product_photos.
--
-- products: lectura pública solo si status='active'; el dueño ve/edita las
-- propias en cualquier estado. No hay policy de DELETE: la app nunca borra
-- filas, "eliminar" es un UPDATE a status='removed' (soft delete, para no
-- romper referencias futuras desde orders en Fase 4).
--
-- Insert además exige verification_status='approved' del propio vendedor,
-- para no depender solo del gate que hace la página /publicar.

alter table public.products enable row level security;
alter table public.product_photos enable row level security;

create policy "Products are publicly readable when active"
on public.products for select
to anon, authenticated
using (status = 'active');

create policy "Owners can view all own products"
on public.products for select
to authenticated
using (seller_id = auth.uid());

create policy "Verified owners can create products"
on public.products for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.users
    where id = auth.uid() and verification_status = 'approved'
  )
);

create policy "Owners can update own products"
on public.products for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

-- product_photos: mismas reglas de visibilidad que su producto padre.
-- No hay policy de DELETE ni de UPDATE: la app solo inserta fotos al crear
-- el producto, no las reemplaza ni las borra todavía (eso queda para
-- cuando sumemos edición de fotos).

create policy "Photos are publicly readable when product is active"
on public.product_photos for select
to anon, authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_photos.product_id
      and products.status = 'active'
  )
);

create policy "Owners can view own product photos"
on public.product_photos for select
to authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_photos.product_id
      and products.seller_id = auth.uid()
  )
);

create policy "Owners can add photos to own products"
on public.product_photos for insert
to authenticated
with check (
  exists (
    select 1 from public.products
    where products.id = product_photos.product_id
      and products.seller_id = auth.uid()
  )
);
