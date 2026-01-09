# Peixeiro Raiz

Web App (com PWA) para simular manejo alimentar e projeção de crescimento de tilápias, com motor de cálculo determinístico e histórico de simulações por usuário.

## Visão rápida

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui
- **Auth & DB:** Supabase (Auth + Postgres)
- **Cálculo:** `shared/engine.ts` (versão `ENGINE_VERSION`)
- **Online:** chamada à **Supabase Edge Function** (`/functions/v1/calculate`)
- **Offline:** cálculo local no dispositivo (não salva histórico)

## Rotas do App

- `/` → login/cadastro
- `/calculator` → calculadora (protegida)
- `/history` → histórico (protegida)

## Scripts

- `npm run dev` → inicia o servidor Node (dev)
- `npm run dev:client` → inicia o Vite (porta 5000)
- `npm run build` → build de produção
- `npm run start` → roda build de produção
- `npm run test` / `npm run test:run` → testes (Vitest)
- `npm run check` → TypeScript (tsc)

## Como rodar localmente

### 1) Instalar dependências

```bash
npm install
```

### 2) Variáveis de ambiente

Você vai precisar configurar as variáveis de Supabase para o frontend e (se for usar) para o servidor.

Em geral, o frontend usa variáveis `VITE_*` (via Vite) e o servidor usa `SUPABASE_URL`.

Exemplos de variáveis esperadas pelo código:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (para o middleware de auth do servidor)

> Dica: se o Supabase não estiver configurado, o app desabilita features de auth (ver `client/src/hooks/use-auth.tsx`).

### 3) Rodar o frontend

```bash
npm run dev:client
```

### 4) (Opcional) Rodar o servidor Express

```bash
npm run dev
```

## Fluxos principais

### Cálculo (online)

1. Usuário preenche o formulário em `/calculator`.
2. App chama a Edge Function: `POST {SUPABASE_URL}/functions/v1/calculate`.
3. Recebe `{ output, engineVersion }`.
4. Salva em `feeding_simulations` no Supabase (com `engine_version`).

### Cálculo (offline)

- Se `navigator.onLine === false`, o cálculo roda localmente usando `calculateSimulation()`.
- O resultado **não é salvo** no histórico.

### Histórico

- Busca no Supabase por `feeding_simulations` filtrando `user_id`.
- Permite abrir a simulação e excluir.

## Modelagem (tabelas)

O schema de referência está em `shared/schema.ts`.

- `users` — perfil básico sincronizado após login
- `feeding_simulations` — input/output (JSON) + engine_version
- `subscriptions` — status (`blocked` | `active`) para paywall/assinatura (ainda pendente no app)
- `engine_versions` — versionamento e rastreio de lógica

## Motor de cálculo

- Implementação: `shared/engine.ts`
- Entrada: `SimulationInput`
- Saída: `SimulationOutput`
- Versão: `ENGINE_VERSION`

## Documentação

- Requisitos atuais: `docs/Requirement.md`
- Lógica técnica: `docs/LOGICA_CALCULO_TECNICO.md`

## Próximos passos sugeridos

- Implementar paywall baseado em `subscriptions.status`.
- Padronizar o caminho de backend (Edge Function vs Express) e autenticação.
- Evoluir a UI para exibir `biomass`, `dailyFeed`, `dailyCost` e a tabela/gráfico de `projections`.
