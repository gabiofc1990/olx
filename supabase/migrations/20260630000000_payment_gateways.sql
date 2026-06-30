-- Tabela de gateways de pagamento suportados pelo painel admin.
-- Necessária para que /admin -> Gateways carregue via listGateways (server fn)
-- sem disparar PGRST205 ("table not found") -> "TypeError: fetch failed" no client.

create table if not exists public.payment_gateways (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null check (provider in (
    'bspay', 'pushinpay', 'pixup', 'blackcat', 'vizzionpay'
  )),
  credentials jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante que apenas um gateway pode estar ativo por vez.
create unique index if not exists payment_gateways_one_active
  on public.payment_gateways (is_active)
  where is_active = true;

-- Trigger pra manter updated_at.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payment_gateways_updated_at on public.payment_gateways;
create trigger trg_payment_gateways_updated_at
  before update on public.payment_gateways
  for each row execute function public.set_updated_at();

-- RLS: leitura autenticada, escrita só admins (via user_roles).
alter table public.payment_gateways enable row level security;

drop policy if exists payment_gateways_select_authenticated on public.payment_gateways;
create policy payment_gateways_select_authenticated
  on public.payment_gateways for select
  to authenticated
  using (true);

drop policy if exists payment_gateways_modify_admins on public.payment_gateways;
create policy payment_gateways_modify_admins
  on public.payment_gateways for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
