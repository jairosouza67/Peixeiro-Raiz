-- ============================================================
-- MIGRAÇÃO: Adicionar coluna email na tabela subscriptions
-- ============================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- Caminho: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

BEGIN;

-- 1) Adicionar coluna email (nullable para manter compatibilidade com registros existentes)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS email text NULL;

-- 2) Preencher emails existentes a partir da tabela users
-- (isso atualiza todos os registros que já existem na tabela)
UPDATE public.subscriptions s
SET email = u.email
FROM public.users u
WHERE s.user_id = u.id
AND s.email IS NULL;

-- 3) Criar índice para buscas por email (útil para gestão administrativa)
CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON public.subscriptions(email);

COMMIT;

-- ============================================================
-- VERIFICAÇÃO (opcional): Rode para confirmar que funcionou
-- ============================================================
-- SELECT id, user_id, email, status FROM public.subscriptions LIMIT 10;
