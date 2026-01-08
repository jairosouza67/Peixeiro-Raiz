# Peixeiro Raiz - Documento de Requisitos do Produto

## 1. Visão Geral do Produto

### 1.1 Nome do Aplicativo
Peixeiro Raiz

### 1.2 Descrição do Aplicativo
Peixeiro Raiz é uma aplicação web (Web App + PWA) que executa cálculos alimentares e projeções de crescimento de tilápias, replicando a lógica da planilha original célula por célula. O sistema oferece controle de acesso via assinatura paga e permite aos usuários realizar simulações precisas de manejo alimentar.

### 1.3 Objetivo\nSubstituir a planilha Excel original por uma solução web confiável, determinística e escalável, mantendo precisão numérica idêntica aos cálculos originais.
\n## 2. Funcionalidades Principais

### 2.1 Sistema de Autenticação
- Cadastro de usuário com email e senha
- Login via Supabase Auth
- Controle de sessão\n
### 2.2 Sistema de Assinatura\n- Registro automático em subscriptions após cadastro
- Status inicial: bloqueado
- Integração com gateway de pagamento (Stripe/Mercado Pago)
- Webhook para atualização de status
- Middleware de verificação de acesso

### 2.3 Motor de Cálculo
- Cálculo de biomassa\n- Cálculo de ração diária
- Cálculo de ração por trato
- Cálculo de ganho de peso
- Projeção semanal de crescimento
- Consumo acumulado de ração
- Cálculo de custo\n- Versionamento do motor de cálculo
- Execução local no frontend

### 2.4 Formulário de Entrada
Campos de entrada idênticos à planilha original:
- Peso médio inicial
- Quantidade de peixes
- Fase (se aplicável)
- Temperatura (se utilizada)
- Preço da ração
- Número de semanas para projeção

### 2.5 Exibição de Resultados
**Resultado Imediato:**
- Biomassa atual
- Ração por dia
- Número de tratos por dia
- Ração por trato
- Custo diário

**Projeção Semanal:**
- Tabela com dados semanais
- Peso médio por semana
- Consumo acumulado
- Gráfico de evolução

### 2.6 Armazenamento de Simulações\n- Salvamento automático de cada simulação
- Registro de inputs, outputs e versão do motor utilizada
- Histórico de simulações por usuário

## 3. Estrutura de Dados

### 3.1 Tabela: subscriptions
- id: identificador único
- user_id: referência ao usuário
- status: inactive | active | canceled
- plan: plano de assinatura
- expires_at: data de expiração
- gateway_ref: referência do gateway de pagamento

### 3.2 Tabela: feeding_simulations
- id: identificador único
- user_id: referência ao usuário\n- engine_version: versão do motor utilizada
- input_json: dados de entrada
- output_json: resultados calculados
- created_at: data de criação

### 3.3 Tabela: engine_versions
- version: número da versão
- description: descrição das alterações
- created_at: data de criação

## 4. Fluxo de Usuário

### 4.1 Fluxo de Acesso
1. Usuário acessa a aplicação
2. Realiza cadastro ou login
3. Sistema verifica status da assinatura
4. Se inativo: redireciona para paywall
5. Se ativo: acessa formulário de cálculo

### 4.2 Fluxo de Cálculo
1. Usuário preenche formulário com dados dos peixes
2. Clica em calcular
3. Motor executa cálculos localmente
4. Sistema exibe resultados imediatos
5. Sistema exibe projeção semanal com tabela e gráfico
6. Simulação é salva automaticamente no banco de dados

### 4.3 Fluxo de Pagamento
1. Usuário clica em Assinar
2. Redirecionado para gateway de pagamento
3. Realiza pagamento\n4. Gateway envia webhook para Supabase Edge Function
5. Sistema atualiza status da assinatura para active
6. Usuário obtém acesso completo\n
## 5. Requisitos Técnicos

### 5.1 Frontend
- Framework: Next.js (App Router)\n- Linguagem: TypeScript
- Estilização: Tailwind CSS + Shadcn UI
- PWA habilitado
- Cálculos executados no frontend
\n### 5.2 Backend
- Plataforma: Supabase\n- Autenticação: Supabase Auth
- Banco de dados: PostgreSQL
- Segurança: Row Level Security (RLS)
- Webhooks: Supabase Edge Functions
\n### 5.3 Requisitos de Precisão
- Cálculo determinístico
- Precisão numérica compatível com Excel
- Diferença máxima permitida: 0,001
- Motor versionado e imutável
- Resultados nunca mudam sem mudança explícita de versão
\n### 5.4 Requisitos de Performance
- Latência baixa (cálculo local)
- Resposta imediata ao usuário
- Sem custo de infraestrutura para cálculos

## 6. Telas do MVP

### Tela 1: Login/Cadastro
- Campos de email e senha
- Botão de login
- Link para cadastro
- Integração com Supabase Auth\n
### Tela 2: Paywall
- Mensagem clara sobre necessidade de assinatura
- Botão Assinar
- Exibição do status atual da assinatura

### Tela 3: Formulário de Cálculo
- Campos de entrada conforme planilha original
- Validação de dados
- Botão de calcular
\n### Tela 4: Resultado Imediato
- Exibição de biomassa
- Ração por dia
- Tratos por dia
- Ração por trato
- Custo diário

### Tela 5: Projeção Semanal
- Tabela com dados semanais
- Peso médio por semana
- Consumo acumulado
- Gráfico de evolução

## 7. Regras de Negócio

### 7.1 Controle de Acesso
- Acesso inicial sempre bloqueado após cadastro
- Liberação apenas após confirmação de pagamento
- Verificação de status em cada acesso

### 7.2 Motor de Cálculo
- Código imutável por versão
- Cada simulação registra a versão utilizada
- Proibido recalcular dados antigos com motor novo
- Garantia de reprodutibilidade dos resultados

### 7.3 Armazenamento\n- Todas as simulações são salvas\n- Inputs e outputs preservados
- Versionamento obrigatório
\n## 8. Critérios de Aceite
\n### 8.1 Precisão de Cálculo
- Mesmo input deve gerar mesmo output da planilha original
- Diferença máxima tolerada: 0,001
- Teste comparativo validado manualmente

### 8.2 Funcionalidade
- Sistema de autenticação operacional
- Controle de assinatura funcional
- Cálculos executados corretamente
- Resultados exibidos adequadamente
- Simulações salvas com sucesso

### 8.3 Performance
- Cálculos instantâneos
- Interface responsiva
- PWA instalável
\n## 9. Escopo Excluído (Versão Inicial)

- Sugestão automática de manejo\n- Alertas inteligentes
- Integração com sensores
- Suporte a múltiplas espécies
- Funcionalidades de IA

## 10. Imagem de Referência

Utilizar a imagem Imagem1.png fornecida pelo usuário como referência visual para o conceito do aplicativo.

## 11. Próximos Passos

1. Implementar exatamente conforme especificado
2. Lançar para grupo restrito de usuários
3. Validar confiança e precisão dos cálculos
4. Coletar feedback\n5. Apenas após validação, considerar adição de funcionalidades inteligentes