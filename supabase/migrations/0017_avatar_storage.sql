-- Fase F: bucket público para fotos de perfil, mismo patrón que
-- product-photos (0010_product_photos_storage.sql): carpeta por usuario,
-- cualquiera lee, solo el dueño sube/reemplaza dentro de su propia carpeta.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "Owners can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owners can replace their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
