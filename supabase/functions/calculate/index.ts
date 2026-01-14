// Supabase Edge Function - Calculate Simulation
// Deploy: supabase functions deploy calculate

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import shared modules
import { calculateSimulation, ENGINE_VERSION } from '../_shared/engine.ts'
import { jsonResponse, corsPreflightResponse } from '../_shared/cors.ts'

// Input validation schema (mirrors shared/schema.ts)
interface SimulationInput {
  initialWeight: number;
  quantity: number;
  temperature: number;
  feedPrice: number;
  weeks: number;
  phase?: string;
}

function validateInput(input: unknown): { valid: true; data: SimulationInput } | { valid: false; errors: string[] } {
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const errors: string[] = [];
  const data = input as Record<string, unknown>;

  // initialWeight
  if (typeof data.initialWeight !== 'number' || data.initialWeight < 0.5 || data.initialWeight > 200000) {
    errors.push('initialWeight must be between 0.5 and 200000');
  }

  // quantity
  if (typeof data.quantity !== 'number' || !Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 2000000) {
    errors.push('quantity must be an integer between 1 and 2000000');
  }

  // temperature
  if (typeof data.temperature !== 'number' || data.temperature < 10 || data.temperature > 40) {
    errors.push('temperature must be between 10 and 40');
  }

  // feedPrice
  if (typeof data.feedPrice !== 'number' || data.feedPrice < 0 || data.feedPrice > 10000) {
    errors.push('feedPrice must be between 0 and 10000');
  }

  // weeks
  if (typeof data.weeks !== 'number' || !Number.isInteger(data.weeks) || data.weeks < 1 || data.weeks > 52) {
    errors.push('weeks must be an integer between 1 and 52');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      initialWeight: data.initialWeight as number,
      quantity: data.quantity as number,
      temperature: data.temperature as number,
      feedPrice: data.feedPrice as number,
      weeks: data.weeks as number,
      phase: typeof data.phase === 'string' ? data.phase : undefined,
    },
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin);
  }

  try {
    const { input } = await req.json();

    // Validate input with detailed errors
    const validation = validateInput(input);
    if (!validation.valid) {
      return jsonResponse(400, { error: 'Invalid input', details: validation.errors }, origin);
    }

    // Calculate using shared engine
    const output = calculateSimulation(validation.data);

    return jsonResponse(200, { output, engineVersion: ENGINE_VERSION }, origin);
  } catch (error) {
    return jsonResponse(500, { error: (error as Error).message || 'Unknown error' }, origin);
  }
})
