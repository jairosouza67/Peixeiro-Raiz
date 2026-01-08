# 📐 Lógica de Cálculo - Documentação Técnica

**Versão:** 1.0  
**Data:** 08/01/2026  
**Arquivo Principal:** [`client/src/lib/engine.ts`](../client/src/lib/engine.ts)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Dados](#estrutura-de-dados)
3. [Fluxo Principal de Cálculo](#fluxo-principal-de-cálculo)
4. [Cálculo Imediato (Dashboard)](#cálculo-imediato-dashboard)
5. [Projeções Semanais](#projeções-semanais)
6. [Fórmulas Detalhadas](#fórmulas-detalhadas)
7. [Casos Especiais e Edge Cases](#casos-especiais-e-edge-cases)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O motor de cálculo replica a lógica da planilha Excel "Planilha Criador Inteligente - Final.xlsx". O objetivo é calcular:

- **Consumo diário de ração** (kg)
- **Consumo por trato** (gramas)
- **Número de tratos por dia**
- **Tipo de ração recomendada**
- **Projeções semanais** (opcional)

### Premissa Fundamental

⚠️ **CRÍTICO:** O cálculo usa os valores de peso **DA TABELA DE CRESCIMENTO**, não o peso de entrada do usuário diretamente!

**Exemplo:**
- Usuário digita: 19g
- Sistema encontra: Linha com startWeight=14g, endWeight=21g
- Sistema usa: 14g e 21g para cálculos (NÃO 19g!)

---

## 📊 Estrutura de Dados

### 1. Tabela de Crescimento (`GROWTH_TABLE`)

Array de 33 linhas extraído da aba "Tilápia" (linhas 4-36) da planilha Excel.

```typescript
interface GrowthDataRow {
  startWeight: number;    // P.M. inicial (g) - Coluna B
  endWeight: number;      // P.M. final (g) - Coluna C
  pvBase: number;         // %PV base - Coluna K
  feedings: number;       // Tratos por dia - Coluna Q
  feedType: string;       // Tipo de ração - Coluna S
}
```

**Exemplo de Linha:**
```typescript
{ 
  startWeight: 14,      // Peixes de 14g a 21g
  endWeight: 21, 
  pvBase: 0.07,         // 7% do peso vivo
  feedings: 6,          // 6 tratos por dia
  feedType: "Ração 40% 1,7 a 2 mm" 
}
```

### 2. Tabela de Correção de Temperatura (`TEMP_CORRECTION`)

Array de 12 linhas extraído da aba "Tilápia" (células AB6:AC17).

```typescript
interface TempCorrection {
  temp: number;    // Temperatura (°C)
  factor: number;  // Fator de correção (0.8 a 1.0)
}
```

**Faixas:**
- 21-22°C: fator 0.8 (baixo metabolismo)
- 23-24°C: fator 0.85
- 25-31°C: fator 1.0 (ótimo)
- 32°C: fator 0.9 (estresse térmico)

---

## 🔄 Fluxo Principal de Cálculo

### Entrada (`SimulationInput`)

```typescript
{
  initialWeight: number;  // Peso médio atual (g) - OBRIGATÓRIO
  quantity: number;       // Quantidade de peixes - OBRIGATÓRIO
  temperature: number;    // Temperatura da água (°C) - OBRIGATÓRIO
  feedPrice: number;      // Preço da ração (R$/kg) - Interno (padrão: 4.50)
  weeks: number;          // Semanas de projeção - Interno (padrão: 12)
  phase: string;          // Fase de crescimento - Interno (padrão: 'Autodetect')
}
```

**Campos Visíveis no Formulário:**
- ✅ Peso Médio Atual (g)
- ✅ Quantidade de Peixes
- ✅ Temperatura da Água (°C)

**Campos Internos (não visíveis):**
- Preço da Ração: R$ 4,50/kg (valor fixo padrão)
- Projeção: 12 semanas (valor fixo padrão)
- Fase: 'Autodetect' (detecção automática)

### Saída (`SimulationOutput`)

```typescript
{
  biomass: number;           // Biomassa inicial (kg) - 2 decimais
  dailyFeed: number;         // Consumo diário (kg) - 2 decimais
  dailyFeedings: number;     // Número de tratos/dia - inteiro
  feedPerFeeding: number;    // Gramas por trato - INTEIRO (sem decimais)
  feedType: string;          // Tipo de ração recomendada
  dailyCost: number;         // Custo diário (R$) - 2 decimais
  fcr: number;               // FCR estimado - 2 decimais
  projections: WeeklyProjection[]; // Projeções semanais
}
```

**Formatação na Interface:**
- **feedPerFeeding**: Exibido como número inteiro sem casas decimais (ex: "204" não "204,2")
- **feedType**: Texto exibido em card destacado
- **dailyFeedings**: Número de vezes ao dia (inteiro)

---

## 🎯 Cálculo Imediato (Dashboard)

Este é o cálculo mais importante, mostrado no painel principal do app.

### Passo 1: Encontrar a Linha da Tabela

**Função:** `getGrowthData(weight: number)`

**Lógica:** VLOOKUP com aproximação (TRUE no Excel)
- Encontra a **maior** linha onde `startWeight <= peso_input`
- Equivalente ao Excel: `VLOOKUP(peso, B:B, ..., TRUE)`

```typescript
function getGrowthData(weight: number) {
  // Percorre a tabela de trás para frente
  const entry = [...GROWTH_TABLE].reverse().find(row => weight >= row.startWeight);
  return entry || GROWTH_TABLE[0];
}
```

**Exemplo:**
```typescript
// Entrada: 19g
getGrowthData(19);

// Tabela:
// Row 8: startWeight=9,  endWeight=14  ← Não (19 > 14)
// Row 9: startWeight=14, endWeight=21  ← SIM! (19 >= 14 e 19 < 21)
// Row 10: startWeight=21, endWeight=31 ← Não (19 < 21)

// Retorno:
{
  startWeight: 14,
  endWeight: 21,
  pvBase: 0.07,
  feedings: 6,
  feedType: "Ração 40% 1,7 a 2 mm"
}
```

### Passo 2: Calcular Biomassa

⚠️ **ATENÇÃO:** Usar `startData.startWeight` e `startData.endWeight`, NÃO `initialWeight`!

```typescript
const startData = getGrowthData(initialWeight);

// CORRETO: Usar pesos da TABELA
const startBiomass = (startData.startWeight * quantity) / 1000;
const endBiomass = (startData.endWeight * quantity) / 1000;

// ERRADO: NÃO fazer isso!
// const startBiomass = (initialWeight * quantity) / 1000; ❌
```

**Exemplo (19g, 1000 peixes):**
```typescript
// startData.startWeight = 14g (da tabela)
// startData.endWeight = 21g (da tabela)

startBiomass = 14 * 1000 / 1000 = 14 kg
endBiomass = 21 * 1000 / 1000 = 21 kg
```

### Passo 3: Calcular Consumo Diário

**Fórmula Excel:** `=(AVERAGE(D:E)*L*J/1000)`

Onde:
- `D` = Biomassa inicial (kg)
- `E` = Biomassa final (kg)
- `L` = Quantidade de peixes
- `J` = %PV (percentual do peso vivo)

```typescript
const averageBiomass = (startBiomass + endBiomass) / 2;
const immediateDailyFeed = averageBiomass * startData.pvBase;
```

**Explicação Dimensional:**
```
averageBiomass = (14kg + 21kg) / 2 = 17.5kg (biomassa média)
dailyFeed = 17.5kg * 0.07 = 1.225kg/dia

// Note que NÃO dividimos por 1000 aqui!
// A divisão /1000 no Excel compensa a multiplicação *L
// Porque D e E já contêm (peso * L / 1000)
```

### Passo 4: Calcular Gramas por Trato

**Fórmula Excel:** `=N/Q*1000`

Onde:
- `N` = Consumo diário (kg)
- `Q` = Número de tratos por dia

```typescript
// Aplicar Math.round() para arredondar para inteiro (mesma regra do Excel)
const feedPerFeedingGrams = Math.round((immediateDailyFeed / startData.feedings) * 1000);
```

**Exemplo:**
```
Cálculo bruto = 1.225 / 6 * 1000 = 204.16666...
Arredondado = Math.round(204.16666...) = 204g por trato
```

⚠️ **IMPORTANTE:** O resultado é sempre um **número inteiro** (sem casas decimais), usando a função `Math.round()` do JavaScript, que replica o comportamento do Excel.

---

## 📈 Projeções Semanais

As projeções simulam o crescimento dos peixes ao longo das semanas.

### Algoritmo

```typescript
for (let week = 1; week <= weeks; week++) {
  // 1. Buscar dados para o peso atual
  const data = getGrowthData(currentWeight);
  
  // 2. Calcular biomassa inicial
  const startBiomass = (currentWeight * quantity) / 1000;
  
  // 3. Calcular ganho de peso com correção de temperatura
  const weightGainPotential = data.endWeight - data.startWeight;
  const actualWeightGain = weightGainPotential * tempCorrectionFactor;
  const endWeight = currentWeight + actualWeightGain;
  
  // 4. Calcular biomassa final
  const endBiomass = (endWeight * quantity) / 1000;
  
  // 5. Calcular consumo semanal
  const averageBiomass = (startBiomass + endBiomass) / 2;
  const dailyFeed = averageBiomass * data.pvBase;
  const weekFeed = dailyFeed * 7;
  
  // 6. Atualizar peso para próxima semana
  currentWeight = endWeight;
}
```

### Diferença com Cálculo Imediato

| Aspecto | Cálculo Imediato | Projeções Semanais |
|---------|------------------|-------------------|
| Peso usado | `startData.startWeight/endWeight` | `currentWeight` (atualizado) |
| Biomassa | Valores da tabela | Calculada do peso atual |
| Temperatura | Não afeta | Afeta ganho de peso |
| Propósito | Recomendação atual | Planejamento futuro |

---

## 📐 Fórmulas Detalhadas

### 1. Biomassa Total

```
Biomassa (kg) = Peso Médio (g) × Quantidade ÷ 1000
```

**Unidades:**
- Entrada: gramas (g)
- Saída: quilogramas (kg)

### 2. Consumo Diário

```
Consumo Diário (kg) = Biomassa Média (kg) × %PV
```

Onde:
```
Biomassa Média = (Biomassa Inicial + Biomassa Final) ÷ 2
%PV = Percentual do Peso Vivo (ex: 0.07 = 7%)
```

**Interpretação:**
- Peixes comem 7% do seu peso corporal por dia
- Peso corporal é calculado como média entre início e fim do período

### 3. Gramas por Trato

```
Gramas por Trato = Math.round((Consumo Diário (kg) ÷ Número de Tratos) × 1000)
```

**Conversão e Arredondamento:**
- kg → g: multiplica por 1000
- Arredondamento: `Math.round()` para o inteiro mais próximo
- Resultado: sempre um número inteiro (sem casas decimais)

**Exemplos:**
```
204.16666... → 204g
227.5 → 228g
204.8 → 205g
```

### 4. Fator de Correção de Temperatura

```typescript
function getTempFactor(temp: number): number {
  // Lookup exato na tabela
  const correction = TEMP_CORRECTION.find(t => t.temp === Math.round(temp));
  if (correction) return correction.factor;
  
  // Limites
  if (temp < 21) return 0.8;
  if (temp > 32) return 0.9;
  
  // Interpolação linear entre dois pontos
  // Ex: 25.5°C → interpolar entre 25°C e 26°C
}
```

### 5. Ganho de Peso Semanal (Projeções)

```
Ganho Potencial = endWeight - startWeight (da tabela)
Ganho Real = Ganho Potencial × Fator de Temperatura
Peso Final = Peso Inicial + Ganho Real
```

**Exemplo:**
```
// Linha: 14-21g, Temperatura: 26°C (fator 1.0)
Ganho Potencial = 21 - 14 = 7g
Ganho Real = 7 × 1.0 = 7g
Peso Final = 14 + 7 = 21g

// Linha: 14-21g, Temperatura: 23°C (fator 0.85)
Ganho Potencial = 21 - 14 = 7g
Ganho Real = 7 × 0.85 = 5.95g
Peso Final = 14 + 5.95 = 19.95g
```

---

## ⚠️ Casos Especiais e Edge Cases

### 1. Peso Abaixo do Mínimo

**Cenário:** Usuário digita 0.2g (abaixo de 0.5g)

**Comportamento:**
```typescript
getGrowthData(0.2); // Retorna GROWTH_TABLE[0]
// { startWeight: 0.5, endWeight: 1.5, ... }
```

**Resultado:** Usa a primeira linha da tabela.

### 2. Peso Acima do Máximo

**Cenário:** Usuário digita 1500g (acima de 1194g)

**Comportamento:**
```typescript
getGrowthData(1500); // Retorna última linha
// { startWeight: 1134, endWeight: 1194, ... }
```

**Resultado:** Usa a última linha da tabela.

### 3. Peso Exatamente no Limite

**Cenário:** Usuário digita 21g (limite entre duas linhas)

**Comportamento:**
```typescript
// Row 9: startWeight=14, endWeight=21
// Row 10: startWeight=21, endWeight=31

getGrowthData(21);
// Retorna Row 10 (21 >= 21)
```

**Resultado:** Seleciona a linha que **começa** com aquele peso.

### 4. Temperatura Fora da Faixa

**Cenário:** Temperatura = 15°C ou 35°C

**Comportamento:**
```typescript
getTempFactor(15); // < 21 → retorna 0.8
getTempFactor(35); // > 32 → retorna 0.9
```

**Resultado:** Usa os fatores limite.

### 5. Quantidade Zero

**Cenário:** Usuário digita quantity = 0

**Resultado:**
```typescript
startBiomass = 0 * 1000 / 1000 = 0 kg
dailyFeed = 0 * pvBase = 0 kg
feedPerFeeding = 0 / 6 * 1000 = 0g
```

**Status:** Funcional, mas sem sentido prático. Considerar validação no frontend.

---

## 🔧 Troubleshooting

### Problema 1: Resultado Diferente da Planilha

**Sintomas:**
- Gramas por trato não bate com Excel
- Consumo diário diferente

**Diagnóstico:**
1. Verificar se está usando `startData.startWeight/endWeight` (correto)
2. Verificar se NÃO está usando `initialWeight` diretamente (errado)
3. Comparar linha selecionada pelo VLOOKUP

**Exemplo de Debug:**
```typescript
console.log('Input weight:', initialWeight);
const data = getGrowthData(initialWeight);
console.log('Selected row:', data);
console.log('Using startWeight:', data.startWeight);  // Deve ser diferente de initialWeight!
console.log('Using endWeight:', data.endWeight);
```

### Problema 2: VLOOKUP Selecionando Linha Errada

**Causa Comum:** Lógica de busca invertida

**Verificar:**
```typescript
// CORRETO (busca de trás para frente)
[...GROWTH_TABLE].reverse().find(row => weight >= row.startWeight)

// ERRADO
GROWTH_TABLE.find(row => weight <= row.endWeight)
```

### Problema 3: Conversão de Unidades

**Checklist:**
- [ ] Peso: gramas → kg (÷ 1000)
- [ ] Consumo diário: kg (não converter)
- [ ] Gramas por trato: kg → g (× 1000)

**Fórmula Completa com Unidades:**
```
startBiomass [kg] = startWeight [g] × quantity [un] ÷ 1000 [g/kg]
dailyFeed [kg] = biomass [kg] × pvBase [adimensional]
feedPerFeeding [g inteiro] = Math.round(dailyFeed [kg] ÷ feedings [un] × 1000 [g/kg])
```

**Arredondamento:**
- `feedPerFeeding` é sempre um **número inteiro**
- Usa `Math.round()` para arredondar ao inteiro mais próximo
- Não usar `.toFixed()` ou conversões de string

---

## 📚 Referências

### Arquivos Relacionados

1. **Motor de Cálculo:** [`client/src/lib/engine.ts`](../client/src/lib/engine.ts)
2. **Tipos TypeScript:** [`client/src/lib/types.ts`](../client/src/lib/types.ts)
3. **Página Calculadora:** [`client/src/pages/calculator.tsx`](../client/src/pages/calculator.tsx)
4. **Planilha Original:** `docs/Planilha Criador Inteligente - Final.xlsx`

### Fórmulas Excel Originais

**Aba Tilápia:**
- **Coluna D (Biomassa inicial):** `=E[linha-1]` (exceto D4: `=B4*L4/1000`)
- **Coluna E (Biomassa final):** `=C*M/1000*V$2`
- **Coluna J (%PV):** `=K` (cópia da coluna K)
- **Coluna N (Consumo diário):** `=(AVERAGE(D:E)*L*J/1000)`
- **Coluna R (Consumo por trato):** `=N/Q*1000`

**Aba Dashboard:**
- **Temperatura Factor (V2):** `=VLOOKUP(Z2,AB6:AC17,2,TRUE)`
- **Quantidade (U2):** Valor fixo 1000
- **Gramas por trato:** `=VLOOKUP(D5,Tilápia!$B$4:$T$36,18,TRUE)` (coluna R)
- **Tratos por dia:** `=VLOOKUP(D5,Tilápia!$B$4:$T$36,17,TRUE)` (coluna Q)

---

## 🎓 Entendendo o "Truque" da Planilha

### Por Que Usar Pesos da Tabela?

A planilha Excel foi projetada para **simular crescimento por período**:

1. Cada linha representa **uma semana de cultivo**
2. Os peixes crescem de `startWeight` até `endWeight` naquela semana
3. A biomassa é calculada para **o período inteiro**, não para um instante específico

### O Que Isso Significa?

Quando o usuário digita "19g":
- ❌ **Não significa:** "Meus peixes pesam exatamente 19g agora"
- ✅ **Significa:** "Meus peixes estão na faixa de 14-21g"
- 📊 **Resultado:** Use dados da faixa 14-21g (média 17.5g)

### Analogia

Imagine faixas de salário:
- Faixa A: R$ 1.000 - R$ 2.000 → Desconto: 5%
- Faixa B: R$ 2.000 - R$ 3.000 → Desconto: 10%

Se alguém ganha R$ 2.500:
- ❌ **Errado:** Calcular desconto de R$ 2.500
- ✅ **Certo:** Usar desconto da Faixa B (10%)

O mesmo vale para peixes:
- Se peixe pesa 19g:
  - ❌ **Errado:** Calcular com 19g
  - ✅ **Certo:** Usar dados da faixa 14-21g

---

## 📝 Checklist de Manutenção

Ao modificar o código, verificar:

- [ ] Usando `startData.startWeight/endWeight` (não `initialWeight`)
- [ ] VLOOKUP encontra maior valor ≤ input
- [ ] Conversões de unidades corretas (g ↔ kg)
- [ ] **Arredondamento correto:** `Math.round()` para gramas por trato
- [ ] **Resultado inteiro:** `feedPerFeeding` sem casas decimais
- [ ] Fator de temperatura aplicado apenas em projeções
- [ ] Testes com valores dos extremos (0.5g, 1194g, 15°C, 35°C)
- [ ] Resultado bate com planilha Excel para casos de teste
- [ ] Interface mostra apenas 3 campos: peso, quantidade, temperatura

---

## 🐛 Histórico de Bugs

### Bug #1 - Biomassa Calculada com Peso de Entrada (08/01/2026)

**Sintoma:** App mostrando 227.5g/trato, Excel mostrando 204g/trato

**Causa:** 
```typescript
// ERRADO
const startBiomass = (initialWeight * quantity) / 1000;
```

**Correção:**
```typescript
// CORRETO
const startBiomass = (startData.startWeight * quantity) / 1000;
const endBiomass = (startData.endWeight * quantity) / 1000;
```

**Impacto:** Cálculo imediato (dashboard) estava errado em ~10-15%

**Status:** ✅ Corrigido

---

### Bug #2 - Arredondamento com Casas Decimais (08/01/2026)

**Sintoma:** App mostrando 204.2g/trato com uma casa decimal, Excel mostrando 204g (inteiro)

**Causa:**
```typescript
// ERRADO
const feedPerFeedingGrams = (immediateDailyFeed / startData.feedings) * 1000;
// Resultado: 204.16666... (com decimais)

feedPerFeeding: parseFloat(feedPerFeedingGrams.toFixed(1))
// Resultado: 204.2 (arredondado para 1 decimal)
```

**Correção:**
```typescript
// CORRETO
const feedPerFeedingGrams = Math.round((immediateDailyFeed / startData.feedings) * 1000);
// Resultado: 204 (inteiro)

feedPerFeeding: feedPerFeedingGrams
// Resultado: 204 (sem toFixed)
```

**Interface:**
```typescript
// ERRADO
{result.feedPerFeeding.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
// Exibe: "204,2"

// CORRETO  
{result.feedPerFeeding.toLocaleString('pt-BR')}
// Exibe: "204"
```

**Impacto:** Exibição estava incorreta, mostrando casas decimais desnecessárias

**Status:** ✅ Corrigido

---

**Fim do Documento** 📄
