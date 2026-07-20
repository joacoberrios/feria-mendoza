-- Fase G: jerarquía de categorías de 2 niveles (padre/hija).
--
-- Árbol nuevo:
--   Mujer  → Belleza, Accesorios, Calzado, Ropa
--   Hombre → Belleza, Accesorios, Calzado, Ropa (filas separadas)
--   Kids   → Bebés, Niñas, Niños
--   Genéricas (sin padre ni hijas): Electro, Herramientas, Hogar y
--   Jardín, Juguetes, Muebles, Otros
--
-- Mapeo aprobado de las categorías de la Fase 2 (por nombre, no por id):
--   Electrodomésticos → renombrada a "Electro" (conserva id y productos)
--   Electrónica       → consolidada en Electro (remapeo) y desactivada
--   Ropa (genérica)   → su único producto pasa a Mujer→Ropa; desactivada
--   Deportes          → desactivada (sin productos, no está en el árbol)
--   Otros             → se mantiene activa como catch-all (decisión
--                       aprobada, apartándose de la spec de Fase G)
--   Muebles / Hogar y Jardín / Juguetes / Herramientas → quedan tal cual
--
-- Solo las hojas (filas sin hijas) son elegibles como category_id de un
-- producto — regla aplicada en la app (/publicar y sus server actions),
-- no con un constraint: un CHECK no puede mirar otras filas.

alter table public.categories
  add column if not exists parent_id bigint references public.categories (id);

create index if not exists categories_parent_id_idx
  on public.categories (parent_id);

-- 0006_categories.sql puso un unique global en name — incompatible con
-- el árbol nuevo (ej. "Ropa" tiene que existir una vez bajo Mujer y otra
-- bajo Hombre, a propósito). Se reemplaza por un unique compuesto:
-- mismo nombre repetido sigue prohibido dentro del mismo padre (o entre
-- categorías de primer nivel entre sí), pero no entre padres distintos.
-- coalesce(parent_id, 0) para que el "primer nivel" cuente como un único
-- grupo (NULL no es igual a NULL en un unique index normal).
alter table public.categories drop constraint if exists categories_name_key;

create unique index if not exists categories_name_parent_key
  on public.categories (name, coalesce(parent_id, 0));

-- Renombrar antes de remapear, así "Electro" ya existe como destino.
update public.categories
set name = 'Electro'
where name = 'Electrodomésticos' and parent_id is null;

-- Padres nuevos (idempotente vía where not exists).
insert into public.categories (name, active, parent_id)
select v.name, true, null
from (values ('Mujer'), ('Hombre'), ('Kids')) as v(name)
where not exists (
  select 1 from public.categories c
  where c.name = v.name and c.parent_id is null
);

-- Hijas, colgadas de su padre por nombre.
insert into public.categories (name, active, parent_id)
select v.child, true, p.id
from (
  values
    ('Mujer', 'Belleza'), ('Mujer', 'Accesorios'), ('Mujer', 'Calzado'), ('Mujer', 'Ropa'),
    ('Hombre', 'Belleza'), ('Hombre', 'Accesorios'), ('Hombre', 'Calzado'), ('Hombre', 'Ropa'),
    ('Kids', 'Bebés'), ('Kids', 'Niñas'), ('Kids', 'Niños')
) as v(parent, child)
join public.categories p on p.name = v.parent and p.parent_id is null
where not exists (
  select 1 from public.categories c
  where c.name = v.child and c.parent_id = p.id
);

-- Remapeo de productos existentes (3 productos en total al momento de
-- escribir esto — ver conversación de aprobación del mapeo).
update public.products
set category_id = (select id from public.categories where name = 'Electro' and parent_id is null)
where category_id = (select id from public.categories where name = 'Electrónica' and parent_id is null);

update public.products
set category_id = (
  select c.id from public.categories c
  join public.categories p on c.parent_id = p.id
  where p.name = 'Mujer' and c.name = 'Ropa'
)
where category_id = (select id from public.categories where name = 'Ropa' and parent_id is null);

-- Desactivar (no borrar: mantiene integridad referencial y es reversible
-- desde el panel de admin).
update public.categories
set active = false
where parent_id is null and name in ('Electrónica', 'Ropa', 'Deportes');
