# Integração Cakto (Assinatura Semestral) + Paywall (Supabase)

Este documento descreve, de forma **objetiva e executável**, os próximos passos para:

1. Vender assinatura semestral (R$ 47,00 a cada 6 meses) **100% pela Cakto**
2. Usuário criar conta e fazer login no app
3. O app **liberar/bloquear** o acesso com base no status vindo do **webhook da Cakto**

> Estratégia principal: **liberar por e-mail** (o e-mail usado no checkout da Cakto deve ser o mesmo e-mail da conta no app).

---

## 0) Decisão (importante)

### Modelo adotado: vínculo por e-mail
- ✅ Simples de operar
- ✅ Não depende do usuário estar logado no momento da compra
- ⚠️ Exige disciplina: **o e-mail do checkout da Cakto precisa ser o mesmo e-mail do login no app**

> Alternativa (mais robusta): usar `sck` para enviar `user.id` do Supabase no checkout. (Opcional, não necessário se você for exigir o mesmo e-mail.)

---

## 1) Configurar na Cakto (você)

### 1.1 Criar/confirmar o produto e a oferta semestral
No painel da Cakto (ou via API), crie/valide o produto e a oferta com estes parâmetros:

- **Nome do produto:** O Peixeiro Raiz
- Produto do tipo `subscription`
- Oferta do tipo `subscription` com:
  - **Preço:** R$ 47,00
  - **Cobrança a cada 6 meses:**
    - `intervalType = month`
    - `interval = 6`
  - `quantity_recurrences = -1` (cobranças ilimitadas)

> Observação: na API, também existe `recurrence_period` (dias entre cobranças). Se aplicável no seu caso, configure como ~180 dias para semestral.

**Você precisa obter:**
- `checkoutUrl` do seu checkout (ex.: `https://pay.cakto.com.br/...`)

### 1.2 Criar o Webhook (Integrações > Webhooks)
Crie um webhook apontando para a URL pública da nossa Edge Function do Supabase (iremos criar).

**Selecione os eventos abaixo** (mínimo viável):
- Liberar acesso:
  - `subscription_created`
  - `subscription_renewed`
- Bloquear acesso:
  - `subscription_canceled`
  - `subscription_renewal_refused`
  - `refund`
  - `chargeback`
- (Opcional, redundância)
  - `purchase_approved`

**Você precisa obter e guardar:**
- `fields.secret` do webhook (a Cakto inclui esse `secret` no payload; usaremos para validar a requisição)

> Observação operacional: a Cakto pede que o endpoint responda em até **5 segundos**.

---

## 2) Configurar no Supabase (você)

### 2.1 Criar secrets/vars para a Edge Function
No Supabase, configure variáveis de ambiente (secrets) para a Edge Function:
- `CAKTO_WEBHOOK_SECRET` = o `fields.secret` do webhook criado na Cakto

Opcional (recomendado para validação extra via API da Cakto):
- `CAKTO_CLIENT_ID`
- `CAKTO_CLIENT_SECRET`

> A documentação da Cakto menciona OAuth2 com `client_id`/`client_secret`.

### 2.2 Banco: tabela `subscriptions`
O projeto já prevê `subscriptions.status` com `blocked|active`.

Garanta:
- 1 registro por usuário (ideal: `user_id` único)
- default `status = blocked`
- políticas RLS:
  - usuário autenticado só consegue ler a própria assinatura

---

## 3) Implementação no app (eu implemento no código)

### 3.1 Edge Function `cakto-webhook`
Criar uma Supabase Edge Function para receber POST JSON da Cakto.

Ela deve:
1. Ler o JSON do body
2. Validar autenticidade:
   - comparar `payload.secret` com `CAKTO_WEBHOOK_SECRET`
3. Identificar o evento:
   - `payload.event` (ex.: `subscription_created`)
4. Pegar o e-mail do comprador:
   - `payload.data.customer.email`
5. Encontrar o usuário no Supabase pelo e-mail
6. Atualizar a assinatura no banco:
   - `active` quando: `subscription_created` ou `subscription_renewed` (e opcional `purchase_approved`)
   - `blocked` quando: `subscription_canceled`, `subscription_renewal_refused`, `refund`, `chargeback`
7. Responder rápido (200 OK) para não gerar reentregas

### 3.2 Garantir assinatura default no login
No fluxo de login (ou ao carregar a sessão):
- criar/upsert em `subscriptions` com `status=blocked` quando não existir registro

### 3.3 Paywall real e bloqueio de rotas
- Ajustar a proteção de rotas para checar:
  - está logado?
  - `subscriptions.status === active`?
- Se `blocked`, redirecionar para `/paywall`

### 3.4 Tela `/paywall`
- Botão “Assinar” deve abrir o `checkoutUrl` real da Cakto
- Mostrar instrução explícita: **use o mesmo e-mail do login do app**

---

## 4) Testes (passo a passo)

### 4.1 Teste de webhook (rápido)
Use o endpoint de evento de teste do webhook da Cakto (documentação: “Evento de Teste Webhook”) para disparar, por exemplo:
- `subscription_created`
- `subscription_canceled`

Valide no Supabase que:
- `subscriptions.status` muda para `active`/`blocked` de acordo com o evento

### 4.2 Teste real de compra
1. Faça uma compra de teste na Cakto usando o **mesmo e-mail** que você usará no app
2. No app: crie a conta e faça login com esse e-mail
3. Confirme que `/calculator` e `/history` liberam
4. Cancele a assinatura (ou simule `subscription_canceled`) e confirme que o acesso bloqueia

---

## 5) Checklist final (para ir pra produção)

- [ ] Checkout mensal ativo e `checkoutUrl` copiado
- [ ] Webhook configurado com os eventos corretos
- [ ] `fields.secret` do webhook guardado
- [ ] `CAKTO_WEBHOOK_SECRET` configurado no Supabase
- [ ] Tabela `subscriptions` com default `blocked` e RLS ajustado
- [ ] Edge Function `cakto-webhook` publicada e recebendo eventos
- [ ] App bloqueia rotas quando `blocked` e libera quando `active`
- [ ] Paywall abre checkout e orienta “mesmo e-mail”

---

## Observações importantes

- Se o cliente comprar com um e-mail e se cadastrar no app com outro, **não vai liberar automaticamente** no modelo por e-mail.
- Se você quiser eliminar esse risco no futuro, dá para adotar o `sck` no checkout para enviar um identificador do usuário (ex.: `user.id`) e casar pelo `sck` no webhook.
