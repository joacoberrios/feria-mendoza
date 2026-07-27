-- Fase 5: disputas y reembolsos.

create table public.disputes (
  id               bigint generated always as identity primary key,
  order_id         bigint not null unique references public.orders (id),
  opened_by        uuid   not null references public.users (id),
  reason           text   not null
                   check (reason in ('no_llego', 'no_es_lo_comprado', 'llego_daniado', 'otro')),
  comment          text,
  status           text   not null default 'open'
                   check (status in ('open', 'in_review', 'resolved', 'refunded', 'refund_failed')),
  resolution_notes text,
  mp_refund_id     text,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index disputes_order_id_idx    on public.disputes (order_id);
create index disputes_opened_by_idx   on public.disputes (opened_by);
create index disputes_status_idx      on public.disputes (status);

alter table public.disputes enable row level security;

-- Comprador: ve sus propias disputas.
create policy "Buyers see their own disputes"
on public.disputes for select
to authenticated
using (auth.uid() = opened_by);

-- Admin: ve todas.
create policy "Admins see all disputes"
on public.disputes for select
to authenticated
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Solo el comprador de la orden puede abrir una disputa, y solo si la
-- orden está en un estado que lo justifique.
create policy "Buyer can open dispute on their order"
on public.disputes for insert
to authenticated
with check (
  auth.uid() = opened_by
  and exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.buyer_id = auth.uid()
      and o.status in ('paid', 'delivered')
  )
);

-- Solo admin puede actualizar disputas (resolver, reembolsar, etc.).
create policy "Admins can update disputes"
on public.disputes for update
to authenticated
using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
