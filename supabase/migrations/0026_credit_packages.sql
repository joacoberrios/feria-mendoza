-- Fase K: sistema de créditos para publicar sin comisión.

-- Paquetes de créditos (configurables por admin)
create table public.credit_packages (
  id              bigint generated always as identity primary key,
  name            text not null,
  credits         int not null check (credits > 0),
  price           numeric(12, 2) not null check (price > 0),
  expiration_days int not null check (expiration_days > 0),
  active          bool not null default true,
  created_at      timestamptz not null default now()
);

alter table public.credit_packages enable row level security;

create policy "Active packages are publicly readable"
  on public.credit_packages for select
  to anon, authenticated
  using (active = true);

create policy "Admins can view all packages"
  on public.credit_packages for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert packages"
  on public.credit_packages for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update packages"
  on public.credit_packages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- Lotes comprados por usuario (consumo FIFO)
create table public.credit_purchases (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.users (id) on delete cascade,
  package_id        bigint not null references public.credit_packages (id),
  credits_remaining int not null check (credits_remaining >= 0),
  expires_at        timestamptz not null,
  mp_payment_id     text unique,  -- unique para idempotencia del webhook
  created_at        timestamptz not null default now()
);

-- Índice para la búsqueda FIFO (lote más antiguo con saldo y sin vencer)
create index credit_purchases_fifo_idx
  on public.credit_purchases (user_id, created_at, id)
  where credits_remaining > 0;

alter table public.credit_purchases enable row level security;

create policy "Users can view their own purchases"
  on public.credit_purchases for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can view all purchases"
  on public.credit_purchases for select
  to authenticated
  using (public.is_admin());

-- Insert/update/delete solo via service_role (webhook con admin client).


-- Columna en products para registrar qué lote financió la publicación.
-- Si es NOT NULL, la venta de este producto no paga comisión.
alter table public.products
  add column credit_purchase_id bigint references public.credit_purchases (id);


-- Función atómica FIFO: descuenta 1 crédito del lote más antiguo vigente.
-- Devuelve el id del lote consumido, o NULL si no había créditos.
-- SECURITY DEFINER para que el UPDATE con subquery no sea interferido por
-- RLS del row que se está actualizando.
create or replace function public.consume_one_credit(p_user_id uuid)
returns bigint
language plpgsql
security definer
as $$
declare
  v_purchase_id bigint;
begin
  update public.credit_purchases
  set credits_remaining = credits_remaining - 1
  where id = (
    select id from public.credit_purchases
    where user_id = p_user_id
      and expires_at > now()
      and credits_remaining > 0
    order by created_at asc, id asc
    limit 1
  )
  and credits_remaining > 0
  and user_id = p_user_id
  returning id into v_purchase_id;

  return v_purchase_id;  -- NULL si no había créditos disponibles
end;
$$;


-- Plan Crédito Web en publication_plans (mismo mecanismo de toggle que
-- Plan Comisión Web — el admin activa/desactiva desde /admin/planes).
insert into public.publication_plans
  (name, type, price, duration_days, max_active_listings, max_photos, commission_percentage, channel, active)
values
  ('Plan Crédito Web', 'credit', null, null, null, null, 0, 'web', true)
on conflict (name) do nothing;
