-- Fase 4: tabla de órdenes de compra.
--
-- El comprador crea la orden en 'pending' (RLS normal, con su propia
-- sesión). El pasaje a 'paid'/'disputed' lo hace exclusivamente el
-- webhook de Mercado Pago, que corre con la service_role key (sin sesión
-- de usuario real) — por eso no hay ninguna policy de UPDATE para
-- authenticated: ni comprador ni vendedor pueden marcar su propia orden
-- como pagada.

do $$ begin
  create type public.order_status as enum (
    'pending', 'paid', 'delivered', 'disputed', 'refunded', 'resolved'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id),
  buyer_id uuid not null references public.users (id),
  seller_id uuid not null references public.users (id),
  amount numeric(12, 2) not null check (amount >= 0),
  commission_amount numeric(12, 2) not null check (commission_amount >= 0),
  mp_payment_id text,
  mp_preference_id text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists orders_product_id_idx on public.orders (product_id);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);

alter table public.orders enable row level security;

create policy "Buyers and sellers can view their own orders"
on public.orders for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "Admins can view all orders"
on public.orders for select
to authenticated
using (public.is_admin());

create policy "Buyers can create their own pending orders"
on public.orders for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and status = 'pending'
  and seller_id = (select seller_id from public.products where id = product_id)
);
