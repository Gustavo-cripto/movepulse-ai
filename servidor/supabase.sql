-- ============================================================
-- Base de dados da conta MovePulse AI (Supabase)
--
-- Cola isto no SQL Editor do teu projeto e carrega em Run.
-- Cria uma tabela com uma linha por utilizador e regras que
-- garantem que cada pessoa só lê e escreve a sua própria linha.
-- ============================================================

create table if not exists public.perfis (
  id uuid primary key references auth.users on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "ler o próprio perfil" on public.perfis;
create policy "ler o próprio perfil"
  on public.perfis for select
  using (auth.uid() = id);

drop policy if exists "criar o próprio perfil" on public.perfis;
create policy "criar o próprio perfil"
  on public.perfis for insert
  with check (auth.uid() = id);

drop policy if exists "atualizar o próprio perfil" on public.perfis;
create policy "atualizar o próprio perfil"
  on public.perfis for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
