-- Supabase SQL Setup: Users + Subscriptions (Paywall) + RLS
-- Cole este arquivo no SQL Editor do Supabase e execute.
--
-- Objetivo:
-- - Garantir tabelas public.users e public.subscriptions
-- - Garantir 1 subscription por usuário (UNIQUE user_id)
-- - Habilitar RLS e políticas mínimas para o app
-- - (Opcional) Trigger para criar public.users automaticamente ao signup no auth.users

begin;

-- UUID helper
create extension if not exists pgcrypto;

-- 1) Tabela de perfil (espelho do auth.users) usada pelo app
-- Observação: o app faz upsert nessa tabela no login.
create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  full_name text null,
  created_at timestamptz not null default now()
);

-- 2) Subscriptions (paywall)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'blocked' check (status in ('blocked', 'active')),
  plan_id text null,
  trial_end timestamptz null,
  updated_at timestamptz not null default now()
);

-- 2.1) Entitlements por e-mail (preenche via webhook)
-- Isso permite o usuário comprar antes de criar conta/login.
create table if not exists public.cakto_entitlements (
  email text primary key,
  status text not null check (status in ('blocked', 'active')),
  last_event text null,
  raw_payload jsonb null,
  updated_at timestamptz not null default now()
);

-- 1 registro por usuário
create unique index if not exists subscriptions_user_id_unique on public.subscriptions(user_id);

-- Mantém updated_at automático em updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists cakto_entitlements_set_updated_at on public.cakto_entitlements;
create trigger cakto_entitlements_set_updated_at
before update on public.cakto_entitlements
for each row
execute function public.set_updated_at();

-- 3) RLS
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.cakto_entitlements enable row level security;

-- 3.1) Políticas para public.users
-- Permite que o usuário autenticado leia seu próprio perfil
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (id = auth.uid());

-- Permite inserir o próprio perfil (usado no upsert do app)
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = auth.uid());

-- Permite atualizar o próprio perfil
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3.2) Políticas para public.subscriptions
-- Usuário autenticado pode ler a própria assinatura
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());

-- 3.3) Políticas para public.cakto_entitlements
-- Usuário autenticado pode ler o próprio entitlement (por email)
drop policy if exists "cakto_entitlements_select_own" on public.cakto_entitlements;
create policy "cakto_entitlements_select_own"
on public.cakto_entitlements
for select
to authenticated
using (email = (select email from public.users where id = auth.uid()));

-- Usuário autenticado pode criar a própria assinatura (default blocked)
-- Observação: o app só insere status=blocked. Atualizações de status devem ser feitas pelo webhook (service role).
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'blocked'
);

-- Opcional (recomendado): não permitir update direto pelo client.
-- Se você PRECISAR permitir update de outros campos, crie uma policy bem restrita.
drop policy if exists "subscriptions_update_own" on public.subscriptions;

-- Permite o usuário "reivindicar" acesso (blocked -> active) SOMENTE se existir
-- um entitlement ativo para o e-mail dele.
-- Observação: o webhook (service role) continua sendo a fonte oficial e consegue
-- atualizar para blocked/active independentemente dessas policies.
drop policy if exists "subscriptions_update_claim_active" on public.subscriptions;
create policy "subscriptions_update_claim_active"
on public.subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and status = 'active'
  and exists (
    select 1
    from public.users u
    join public.cakto_entitlements e on e.email = u.email
    where u.id = auth.uid()
      and e.status = 'active'
  )
);

-- 4) (Opcional) Trigger: ao criar auth.users, criar/atualizar public.users automaticamente
-- Isso torna o webhook por e-mail mais robusto, mesmo que o usuário ainda não tenha logado no app.
create or replace function public.handle_auth_user_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name_val text;
begin
  full_name_val := nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), '');

  insert into public.users (id, email, full_name)
  values (new.id, new.email, full_name_val)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

-- Cria o trigger se ainda não existir
-- Nota: alguns projetos já têm triggers similares; se der conflito, me diga o erro que eu ajusto.
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created_upsert_public_user'
  ) then
    create trigger on_auth_user_created_upsert_public_user
    after insert on auth.users
    for each row
    execute function public.handle_auth_user_upsert();
  end if;
end $$;

commit;

-- Pronto.
-- Próximos passos fora do SQL:
-- - No Supabase: setar secrets da Edge Function (CAKTO_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY).
-- - No Netlify: setar VITE_CAKTO_CHECKOUT_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
