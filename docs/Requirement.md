# Peixeiro Raiz — Requisitos (Atual do Projeto)

Este documento descreve **o que existe hoje no repositório** (estado real do projeto) e o que está previsto como evolução.

## 1. Visão Geral

### 1.1 Nome
Peixeiro Raiz

### 1.2 Descrição
Aplicação web (Web App + PWA) para simulação de manejo alimentar e projeção de crescimento de tilápias, com motor de cálculo determinístico (versão 1.0.0) e histórico de simulações por usuário.

### 1.3 Objetivo
Substituir a planilha Excel original por uma solução web confiável, versionada e reprodutível, mantendo consistência numérica com a lógica importada.

## 2. Stack e Arquitetura (Implementado)

### 2.1 Frontend
- Framework: **Vite + React (TypeScript)**
- Roteamento: **wouter**
- UI: **Tailwind + shadcn/ui (Radix)**
- Estado/requests: **@tanstack/react-query**
- PWA: **vite-plugin-pwa**

### 2.2 Backend / Serviços
- Autenticação: **Supabase Auth** (client-side)
- Banco: **PostgreSQL (Supabase)**
- Funções: **Supabase Edge Functions** (cálculo remoto quando online)
- Servidor Node (repo): **Express** com rotas (health, cálculo, histórico) + middleware de auth via JWT Supabase (utilizável como alternativa/apoio)

### 2.3 Motor de Cálculo
- Localização: `shared/engine.ts`
- Versão: `ENGINE_VERSION = 1.0.0`
- Uso:
	- Frontend calcula **offline** localmente.
	- Online, o cálculo é feito via **Edge Function** (`/functions/v1/calculate`) e o resultado é salvo no Supabase.

## 3. Funcionalidades (Estado Atual)

### 3.1 Autenticação (Implementado)
- Login/cadastro via Supabase Auth.
- Contexto de sessão no frontend (`client/src/hooks/use-auth.tsx`).
- Sincronização de um registro em `users` via `upsert` após login (perfil básico: `email`, `full_name`).

### 3.2 Controle de Acesso / Assinatura (Implementado ✅)
- Tabela `subscriptions` com status (`blocked`, `active`).
- Tabela `cakto_entitlements` para armazenar compras por email (permite compra antes do cadastro).
- **Paywall implementado no frontend** em `/paywall`.
- Integração com **Cakto** via webhook (`cakto-webhook` Edge Function).
- Rotas protegidas verificam `subscriptions.status === 'active'`.
- Claim automático de acesso no login (se existir entitlement ativo para o email).

### 3.3 Calculadora de Manejo (Implementado)
- Tela protegida: `/calculator`.
- Inputs atuais do formulário:
	- `initialWeight` (g)
	- `quantity` (un)
	- `temperature` (°C)
	- `feedPrice` (R$/kg)
	- `weeks` (semanas)
- Campo `phase` existe no contrato do motor e é enviado como "Autodetect" (não é input do formulário hoje).

### 3.4 Resultados (Implementado parcialmente)
- Exibição imediata (na UI atual):
	- `feedType` (Tipo de ração)
	- `feedPerFeeding` (g por trato)
	- `dailyFeedings` (tratos/dia)
- O motor também retorna (já disponível no output):
	- `biomass`, `dailyFeed`, `dailyCost`, `fcr`, `projections[]`
- Existe base para gráficos (Recharts importado), mas a UI atual prioriza as métricas principais.

### 3.5 Histórico de Simulações (Implementado)
- Tela protegida: `/history`.
- Busca as simulações do Supabase por `user_id`.
- Permite abrir detalhes via modal.
- Permite **deletar** simulações.

### 3.6 Persistência (Implementado)
- Ao calcular **online**:
	- Chama a Edge Function de cálculo.
	- Salva em `feeding_simulations` com `input`, `output`, `engine_version`.
- Ao calcular **offline**:
	- Calcula localmente.
	- **Não salva** no Supabase.

## 4. Motor de Cálculo — Regras (Implementado)

### 4.1 Entrada (Contrato)
Tipo `SimulationInput`:
- `initialWeight` (g)
- `quantity` (un)
- `phase` (string, informativo hoje)
- `temperature` (°C)
- `feedPrice` (R$/kg)
- `weeks` (1..52)

### 4.2 Saída (Contrato)
Tipo `SimulationOutput`:
- `feedType`, `feedPerFeeding` (g), `dailyFeedings`
- `biomass` (kg), `dailyFeed` (kg), `dailyCost` (R$), `fcr`
- `projections[]` semanais com consumo e custo

### 4.3 Determinismo e Versionamento
- O motor é puro e versionado (`ENGINE_VERSION`).
- Cada simulação salva deve registrar a versão do motor usada.

## 5. Estrutura de Dados (No repositório)

> Observação: no código existe o schema Drizzle em `shared/schema.ts`, mas o app também acessa tabelas diretamente via Supabase.

### 5.1 `users`
- `id` (uuid, pk)
- `email` (text, unique, not null)
- `full_name` (text, null)
- `created_at` (timestamp)

### 5.2 `feeding_simulations`
- `id` (uuid, pk)
- `user_id` (uuid, fk users)
- `date` (timestamp)
- `name` (text)
- `input` (jsonb)
- `output` (jsonb)
- `engine_version` (text)

### 5.3 `subscriptions`
- `id` (uuid, pk)
- `user_id` (uuid, fk users, unique)
- `status` (text: `blocked` | `active`)
- `plan_id` (text, null)
- `trial_end` (timestamp, null)
- `updated_at` (timestamp)

### 5.4 `cakto_entitlements`
- `email` (text, pk)
- `status` (text: `blocked` | `active`)
- `last_event` (text, null)
- `raw_payload` (jsonb, null)
- `updated_at` (timestamp)

### 5.5 `engine_versions`
- `version` (text, pk)
- `logic_hash` (text)
- `status` (text)
- `created_at` (timestamp)

## 6. Telas e Rotas (Implementado)

### 6.1 Rotas do Frontend
- `/` → Auth (login/cadastro)
- `/paywall` → Tela de assinatura (protegida, não requer assinatura ativa)
- `/calculator` → Calculadora (protegida, requer assinatura ativa)
- `/history` → Histórico (protegida, requer assinatura ativa)

### 6.2 Rotas do Servidor Node (no repo)
- `GET /health` → status
- `POST /api/calculate` → cálculo (rate limited)
- `POST /api/simulations` → salvar simulação (autenticada)
- `GET /api/simulations/:userId` → listar simulações do usuário (autenticada)

> Nota: o fluxo principal atual do frontend usa **Edge Function** para calcular e **Supabase** para salvar/consultar; as rotas Express estão disponíveis como alternativa.

## 7. Regras de Negócio (Estado Atual)

### 7.1 Acesso
- Proteção de rotas no frontend exige login.
- Paywall bloqueia acesso às telas `/calculator` e `/history` quando `subscriptions.status !== 'active'`.
- Usuários admin (configurados via `VITE_ADMIN_EMAILS`) têm bypass do paywall.

### 7.2 Salvamento
- Só salva quando online e autenticado.
- Offline: cálculo local e feedback ao usuário.

## 8. Requisitos de Qualidade

### 8.1 Precisão
- Motor determinístico.
- Meta de compatibilidade com Excel mantida como requisito.

### 8.2 Performance
- Cálculo local instantâneo no offline.
- Online delega cálculo à Edge Function; UI mantém responsividade.

## 9. Lacunas / Itens Pendentes

- ~~Implementar paywall baseado em `subscriptions.status`.~~ ✅ Concluído
- ~~Implementar integração com gateway + webhooks e atualização de `subscriptions`.~~ ✅ Concluído (Cakto)
- Consolidar estratégia de backend (Edge Function vs Express) e padronizar headers de autenticação.
- Refinar UI da projeção semanal (tabela e gráfico usando `projections`).
- Implementar notificação de expiração de assinatura.
- Adicionar página de gerenciamento de assinatura para o usuário.

## 10. Critérios de Aceite (Atualizados)

- Login/cadastro funcionando com Supabase.
- Rotas protegidas (`/calculator`, `/history`) exigem assinatura ativa.
- Paywall funcional com redirecionamento para checkout Cakto.
- Webhook Cakto recebendo eventos e atualizando `subscriptions`.
- Cálculo online via Edge Function e offline local.
- Simulações salvas e listadas por usuário.
- Engine version registrada em cada salvamento.

## 11. Integração de Pagamentos

### 11.1 Gateway
- **Cakto** como gateway de pagamentos
- Assinatura semestral: R$ 47,00 a cada 6 meses
- Checkout URL: `https://pay.cakto.com.br/mddttpo_722244`

### 11.2 Webhook
- Edge Function: `cakto-webhook`
- URL: `https://kqnrfcapowhwfalwaoxj.supabase.co/functions/v1/cakto-webhook`
- Eventos processados:
  - Liberar acesso: `subscription_created`, `subscription_renewed`, `purchase_approved`
  - Bloquear acesso: `subscription_canceled`, `subscription_renewal_refused`, `refund`, `chargeback`

### 11.3 Fluxo de Compra
1. Usuário acessa `/paywall`
2. Clica em "Assinar na Cakto"
3. Completa pagamento na Cakto (usando mesmo email do app)
4. Cakto envia webhook → `cakto_entitlements` atualizado
5. Usuário faz login → `subscriptions` atualizado automaticamente
6. Acesso liberado