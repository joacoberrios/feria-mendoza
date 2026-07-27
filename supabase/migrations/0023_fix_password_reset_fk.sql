-- Corrige el FK de password_reset_requests: apuntaba a auth.users en
-- lugar de public.users, lo que impedía el join desde PostgREST en el
-- panel admin. La tabla está vacía (el upsert fallaba en silencio antes
-- de este fix), así que el alter es seguro sin migración de datos.

alter table public.password_reset_requests
  drop constraint password_reset_requests_user_id_fkey,
  add constraint password_reset_requests_user_id_fkey
    foreign key (user_id) references public.users (id) on delete cascade;
