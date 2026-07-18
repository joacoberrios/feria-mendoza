-- Fase F (ajuste): separar full_name en first_name/last_name, agregar
-- dni_number (protegido a nivel de columna, igual que los tokens de MP en
-- 0012_mp_seller_fields.sql) y birth_date (validado mayor de 18 al
-- guardar).

alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Split heurístico (primera palabra → nombre, resto → apellido) sobre los
-- pocos usuarios reales existentes. Lossy para nombres/apellidos
-- compuestos, pero editable después desde /perfil.
update public.users
set
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = nullif(trim(regexp_replace(trim(full_name), '^\S+\s*', '')), '')
where full_name is not null and trim(full_name) <> '';

alter table public.users drop column if exists full_name;

-- dni_number: mismo criterio que mp_access_token (0012) — ni el propio
-- dueño de la fila puede leerlo vía la API normal. Solo el cliente admin
-- (service_role) lo toca, en los puntos puntuales que lo necesitan
-- (guardar desde /perfil, panel de /admin/verificaciones).
alter table public.users
  add column if not exists dni_number text;

alter table public.users
  add constraint users_dni_number_format
  check (dni_number is null or dni_number ~ '^[0-9]{7,8}$');

revoke select (dni_number) on public.users from anon, authenticated;

-- birth_date: constraint de mayor de 18 como backstop de base — la app
-- valida lo mismo antes de guardar para poder mostrar un mensaje claro
-- en vez del error crudo de este constraint.
alter table public.users
  add column if not exists birth_date date;

alter table public.users
  add constraint users_birth_date_adult
  check (birth_date is null or birth_date <= (current_date - interval '18 years')::date);
