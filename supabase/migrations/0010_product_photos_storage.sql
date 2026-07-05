-- Fase 2: bucket público para fotos de producto (a diferencia del de DNI,
-- que es privado). Cualquiera lee; solo el dueño sube/reemplaza dentro de
-- su propia carpeta ({seller_id}/...).

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

create policy "Product photos are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-photos');

create policy "Owners can upload their own product photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owners can replace their own product photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'product-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
