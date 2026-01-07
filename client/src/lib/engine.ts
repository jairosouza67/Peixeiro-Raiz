import { SimulationInput, SimulationOutput, WeeklyProjection } from "./types";

/**
 * STANDARD TILAPIA GROWTH MODEL (MVP VERSION)
 * 
 * NOTE: This is a placeholder biological model based on standard aquaculture literature
 * (e.g., FAO, Embrapa) to enable the UI functionality. 
 * 
 * IN PRODUCTION: This logic MUST be replaced by the exact formulas from the client's Excel spreadsheet.
 */

export function calculateSimulation(input: SimulationInput): SimulationOutput {
  const { initialWeight, quantity, temperature, feedPrice, weeks } = input;
  
  // Constants for Tilapia Growth (Simplified Thermal-Unit Growth Coefficient)
  // Optimal temp for Tilapia is ~28C. Growth slows below 24C or above 32C.
  const optimalTemp = 28;
  const tempFactor = 1 - Math.pow((temperature - optimalTemp) / 10, 2); 
  const clampedTempFactor = Math.max(0.5, Math.min(1.0, tempFactor)); // Prevent extreme reduction for MVP

  // Base Feed Conversion Ratio (FCA) - typically 1.2 to 1.8 depending on stage
  // Smaller fish have better FCR.
  const getFCR = (weight: number) => {
    if (weight < 100) return 1.0;
    if (weight < 300) return 1.2;
    if (weight < 600) return 1.4;
    return 1.6;
  };

  // Specific Growth Rate (SGR) approximation (% body weight per day)
  const getSGR = (weight: number) => {
    if (weight < 10) return 5.0; // 5% per day
    if (weight < 50) return 3.5;
    if (weight < 100) return 2.5;
    if (weight < 300) return 1.8;
    if (weight < 600) return 1.2;
    return 0.8;
  };

  let currentWeight = initialWeight;
  let accumulatedFeed = 0;
  let totalCost = 0;
  
  const projections: WeeklyProjection[] = [];

  // Simulate week by week
  for (let w = 1; w <= weeks; w++) {
    let weekFeed = 0;
    
    // Simulate 7 days
    for (let d = 0; d < 7; d++) {
      const sgr = getSGR(currentWeight) * clampedTempFactor;
      const fcr = getFCR(currentWeight);
      
      const weightGain = currentWeight * (sgr / 100);
      const dailyFeed = weightGain * fcr * (quantity / 1000); // kg for whole population (quantity)
                                          // Wait, weightGain is per fish in grams.
                                          // Feed = Gain * FCR.
                                          // Total Feed = (Gain * FCR) * Quantity / 1000 (to kg)
      
      weekFeed += dailyFeed;
      currentWeight += weightGain;
    }

    accumulatedFeed += weekFeed;
    const weekCost = weekFeed * feedPrice;
    totalCost += weekCost;

    projections.push({
      week: w,
      averageWeight: parseFloat(currentWeight.toFixed(1)),
      feedConsumption: parseFloat(weekFeed.toFixed(1)),
      accumulatedConsumption: parseFloat(accumulatedFeed.toFixed(1)),
      biomass: parseFloat(((currentWeight * quantity) / 1000).toFixed(1)),
      cost: parseFloat(weekCost.toFixed(2))
    });
  }

  // Calculate "Immediate" daily values based on CURRENT state (start of simulation)
  // This matches "Tela 4 - Resultado Imediato" usually meaning "Right Now"
  const startBiomass = (initialWeight * quantity) / 1000;
  const startSGR = getSGR(initialWeight) * clampedTempFactor;
  const startFCR = getFCR(initialWeight);
  const startDailyGain = initialWeight * (startSGR / 100);
  const startDailyFeed = (startDailyGain * startFCR * quantity) / 1000;
  
  // Feedings per day strategy
  let dailyFeedings = 2;
  if (initialWeight < 50) dailyFeedings = 4;
  else if (initialWeight < 200) dailyFeedings = 3;

  const feedPerFeeding = startDailyFeed / dailyFeedings;
  const startDailyCost = startDailyFeed * feedPrice;

  return {
    biomass: parseFloat(startBiomass.toFixed(1)),
    dailyFeed: parseFloat(startDailyFeed.toFixed(1)),
    dailyFeedings,
    feedPerFeeding: parseFloat(feedPerFeeding.toFixed(3)),
    dailyCost: parseFloat(startDailyCost.toFixed(2)),
    fcr: startFCR,
    projections
  };
}
