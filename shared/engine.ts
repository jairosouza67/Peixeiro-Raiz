// Shared calculation engine for Peixeiro Raiz
// Kept pure so it can be used reliably on the backend (and in tests).

export interface SimulationInput {
  initialWeight: number; // grams
  quantity: number; // count
  phase: string; // e.g., "Engorda", "Berçário" (currently informational)
  temperature: number; // Celsius
  feedPrice: number; // BRL per kg
  weeks: number; // duration
}

export interface WeeklyProjection {
  week: number;
  averageWeight: number; // grams
  feedConsumption: number; // kg
  accumulatedConsumption: number; // kg
  biomass: number; // kg
  cost: number; // BRL
}

export interface SimulationOutput {
  biomass: number; // kg
  dailyFeed: number; // kg
  dailyFeedings: number; // count (Tratos)
  feedPerFeeding: number; // grams (Consumo por trato)
  feedType: string; // Tipo de ração (ex: "Ração 40% 1,7 a 2 mm")
  dailyCost: number; // BRL
  fcr: number; // Feed Conversion Ratio (CA)
  projections: WeeklyProjection[];
}

export const ENGINE_VERSION = "1.0.0" as const;

// Dados extraídos da aba "Tilápia" (Linhas 4 a 36)
const GROWTH_TABLE = [
  { startWeight: 0.5, endWeight: 1.5, pvBase: 0.15, feedings: 6, feedType: "Ração 45% 1 mm" },
  { startWeight: 1.5, endWeight: 3, pvBase: 0.13, feedings: 6, feedType: "Ração 45% 1 mm" },
  { startWeight: 3, endWeight: 5, pvBase: 0.11, feedings: 6, feedType: "Ração 45% 1 mm" },
  { startWeight: 5, endWeight: 9, pvBase: 0.09, feedings: 6, feedType: "Ração 40% 1,7 a 2 mm" },
  { startWeight: 9, endWeight: 14, pvBase: 0.085, feedings: 6, feedType: "Ração 40% 1,7 a 2 mm" },
  { startWeight: 14, endWeight: 21, pvBase: 0.07, feedings: 6, feedType: "Ração 40% 1,7 a 2 mm" },
  { startWeight: 21, endWeight: 31, pvBase: 0.068, feedings: 6, feedType: "Ração 40% 1,7 a 2 mm" },
  { startWeight: 31, endWeight: 45, pvBase: 0.063, feedings: 6, feedType: "Ração 35% 4 a 6 mm" },
  { startWeight: 45, endWeight: 65, pvBase: 0.058, feedings: 6, feedType: "Ração 35% 4 a 6 mm" },
  { startWeight: 65, endWeight: 90, pvBase: 0.055, feedings: 6, feedType: "Ração 35% 4 a 6 mm" },
  { startWeight: 90, endWeight: 120, pvBase: 0.052, feedings: 3, feedType: "Ração 35% 4 a 6 mm" },
  { startWeight: 120, endWeight: 152, pvBase: 0.05, feedings: 3, feedType: "Ração 35% 4 a 6 mm" },
  { startWeight: 152, endWeight: 190, pvBase: 0.043, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 190, endWeight: 231, pvBase: 0.036, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 231, endWeight: 273, pvBase: 0.033, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 273, endWeight: 316, pvBase: 0.031, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 316, endWeight: 360, pvBase: 0.029, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 360, endWeight: 405, pvBase: 0.027, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 405, endWeight: 451, pvBase: 0.025, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 451, endWeight: 498, pvBase: 0.023, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 498, endWeight: 546, pvBase: 0.022, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 546, endWeight: 595, pvBase: 0.02, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 595, endWeight: 645, pvBase: 0.019, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 645, endWeight: 696, pvBase: 0.018, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 696, endWeight: 748, pvBase: 0.017, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 748, endWeight: 801, pvBase: 0.016, feedings: 3, feedType: "Ração 32% Crescimento 6 a 8 mm" },
  { startWeight: 801, endWeight: 854, pvBase: 0.015, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
  { startWeight: 854, endWeight: 908, pvBase: 0.015, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
  { startWeight: 908, endWeight: 963, pvBase: 0.014, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
  { startWeight: 963, endWeight: 1019, pvBase: 0.013, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
  { startWeight: 1019, endWeight: 1076, pvBase: 0.012, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
  { startWeight: 1076, endWeight: 1134, pvBase: 0.011, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
  { startWeight: 1134, endWeight: 1194, pvBase: 0.011, feedings: 3, feedType: "Ração Terminação 32% 6 a 8 mm" },
];

// Tabela de correção de temperatura (Linhas AB6 a AC17 na aba Tilápia)
const TEMP_CORRECTION = [
  { temp: 21, factor: 0.8 },
  { temp: 22, factor: 0.8 },
  { temp: 23, factor: 0.85 },
  { temp: 24, factor: 0.85 },
  { temp: 25, factor: 0.9 },
  { temp: 26, factor: 1.0 },
  { temp: 27, factor: 1.0 },
  { temp: 28, factor: 1.0 },
  { temp: 29, factor: 1.0 },
  { temp: 30, factor: 1.0 },
  { temp: 31, factor: 1.0 },
  { temp: 32, factor: 0.9 },
];

function getTempFactor(temp: number): number {
  const correction = TEMP_CORRECTION.find((t) => t.temp === Math.round(temp));
  if (correction) return correction.factor;
  if (temp < 21) return 0.8;
  if (temp > 32) return 0.9;

  // Interpolation fallback if not exact
  const sorted = [...TEMP_CORRECTION].sort((a, b) => a.temp - b.temp);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (temp >= sorted[i].temp && temp <= sorted[i + 1].temp) {
      const t1 = sorted[i].temp;
      const t2 = sorted[i + 1].temp;
      const f1 = sorted[i].factor;
      const f2 = sorted[i + 1].factor;
      return f1 + ((f2 - f1) * (temp - t1)) / (t2 - t1);
    }
  }
  return 1.0;
}

function getGrowthData(weight: number) {
  // Encontra a linha onde o peso se encaixa (VLOOKUP TRUE em Excel)
  const entry = [...GROWTH_TABLE].reverse().find((row) => weight >= row.startWeight);
  return entry || GROWTH_TABLE[0];
}

export function calculateSimulation(input: SimulationInput): SimulationOutput {
  const { initialWeight, quantity, temperature, feedPrice, weeks } = input;
  const tempCorrectionFactor = getTempFactor(temperature);

  let currentWeight = initialWeight;
  let accumulatedFeed = 0;
  let totalCost = 0;

  const projections: WeeklyProjection[] = [];

  // Simulando semana a semana conforme a lógica da planilha
  for (let w = 1; w <= weeks; w++) {
    const data = getGrowthData(currentWeight);

    // Biomassa inicial da semana (kg)
    const startBiomass = (currentWeight * quantity) / 1000;

    // Peso Final da semana: StartWeight + (TargetEndWeight - StartWeight) * TempCorrection
    // Na planilha: C4 = B4 + (PlanilhaOriginal!C4 - PlanilhaOriginal!B4) * V$2
    // Mas a lógica da planilha parece ser: Biomassa Final = C4 * M4 / 1000 * V$2
    // Onde M4 é a quantidade final (assumida igual no MVP por enquanto)

    const weightGainPotential = data.endWeight - data.startWeight;
    const actualWeightGain = weightGainPotential * tempCorrectionFactor;
    const endWeight = currentWeight + actualWeightGain;

    const endBiomass = (endWeight * quantity) / 1000;

    // Consumo diário (kg): (BiomassaMédia * %PV) / 1000
    // Na planilha: (AVERAGE(D4:E4) * L4 * J4 / 1000)
    // J4 é o %PV, que é K4 (PV Base)
    const averageBiomass = (startBiomass + endBiomass) / 2;
    const dailyFeed = averageBiomass * data.pvBase;
    const weekFeed = dailyFeed * 7;

    accumulatedFeed += weekFeed;
    const weekCost = weekFeed * feedPrice;
    totalCost += weekCost;

    projections.push({
      week: w,
      averageWeight: parseFloat(endWeight.toFixed(2)),
      feedConsumption: parseFloat(weekFeed.toFixed(2)),
      accumulatedConsumption: parseFloat(accumulatedFeed.toFixed(2)),
      biomass: parseFloat(endBiomass.toFixed(2)),
      cost: parseFloat(weekCost.toFixed(2)),
    });

    currentWeight = endWeight;
  }

  // Valores imediatos para o Dashboard (T0)
  // IMPORTANTE: Usar os pesos DA TABELA (startWeight/endWeight), não o input do usuário!
  // Isso replica a lógica do Excel: VLOOKUP encontra a linha, depois usa D e E daquela linha
  const startData = getGrowthData(initialWeight);

  // Biomassa usando os valores da TABELA (não o input do usuário)
  const startBiomass = (startData.startWeight * quantity) / 1000;
  const endBiomass = (startData.endWeight * quantity) / 1000;

  // Fórmula da planilha: AVERAGE(D:E) * L * J / 1000
  // onde D e E já contém (peso * quantidade / 1000)
  const averageBiomass = (startBiomass + endBiomass) / 2;
  const immediateDailyFeed = averageBiomass * startData.pvBase;

  // Consumo por trato em GRAMAS: =N/Q*1000 (fórmula da planilha)
  // Arredondamento: Math.round() para inteiro (mesma regra do Excel)
  const feedPerFeedingGrams = Math.round((immediateDailyFeed / startData.feedings) * 1000);
  const dailyCost = immediateDailyFeed * feedPrice;

  // Cálculo de FCR estimado (CA)
  // FCA = Consumo / Ganho de Peso
  const totalWeightGain = ((currentWeight - initialWeight) * quantity) / 1000;
  const fcr = totalWeightGain > 0 ? accumulatedFeed / totalWeightGain : 0;

  return {
    biomass: parseFloat(startBiomass.toFixed(2)),
    dailyFeed: parseFloat(immediateDailyFeed.toFixed(2)),
    dailyFeedings: startData.feedings,
    feedPerFeeding: feedPerFeedingGrams, // Já é inteiro, não precisa de toFixed
    feedType: startData.feedType,
    dailyCost: parseFloat(dailyCost.toFixed(2)),
    fcr: parseFloat(fcr.toFixed(2)),
    projections,
  };
}
