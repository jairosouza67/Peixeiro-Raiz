import type { SimulationInput, SimulationOutput, WeeklyProjection } from "@shared/engine";

export type { SimulationInput, SimulationOutput, WeeklyProjection } from "@shared/engine";

export interface Simulation {
  id: string;
  date: string;
  name: string;
  input: SimulationInput;
  output: SimulationOutput;
}
