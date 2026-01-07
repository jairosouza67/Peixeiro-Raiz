export interface SimulationInput {
  initialWeight: number; // grams
  quantity: number; // count
  phase: string; // e.g., "Engorda", "Berçário"
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
  dailyFeedings: number; // count
  feedPerFeeding: number; // kg
  dailyCost: number; // BRL
  fcr: number; // Feed Conversion Ratio (CA)
  projections: WeeklyProjection[];
}

export interface Simulation {
  id: string;
  date: string;
  name: string;
  input: SimulationInput;
  output: SimulationOutput;
}
