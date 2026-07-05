-- Fase 1: bucket privado para fotos de DNI.
-- Cada usuario sube/lee solo archivos bajo su propia carpeta
-- ({user_id}/archivo); el admin puede leer cualquiera para revisar
-- verificaciones pendientes.

insert into storage.buckets (id, name, public)
values ('dni-photos', 'dni-photos', false)
on conflict (id) do nothing;

create policy "Users can upload own dni photo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dni-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view own dni photo"
on storage.objects for select
to authenticated
using (
  bucket_id = 'dni-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can replace own dni photo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'dni-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'dni-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Admins can view all dni photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'dni-photos'
  and public.is_admin()
);
