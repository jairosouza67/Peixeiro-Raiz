import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SimulationInput, SimulationOutput } from "@shared/engine";
import { logger } from "../lib/logger";

// Backend Supabase client with service role key (not exposed to frontend)
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables for backend"
      );
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

export interface SaveSimulationParams {
  userId: string;
  name: string;
  input: SimulationInput;
  output: SimulationOutput;
  engineVersion: string;
}

export async function saveSimulation(params: SaveSimulationParams) {
  const supabase = getSupabaseAdmin();

  logger.debug({ userId: params.userId, engineVersion: params.engineVersion }, "Saving simulation");

  const { data, error } = await supabase.from("feeding_simulations").insert({
    user_id: params.userId,
    name: params.name,
    input: params.input,
    output: params.output,
    engine_version: params.engineVersion,
  }).select().single();

  if (error) {
    logger.error({ error: error.message, userId: params.userId }, "Failed to save simulation");
    throw new Error(`Failed to save simulation: ${error.message}`);
  }

  logger.info({ simulationId: data.id, userId: params.userId }, "Simulation saved successfully");
  return data;
}

export async function getSimulationsByUser(userId: string) {
  const supabase = getSupabaseAdmin();

  logger.debug({ userId }, "Fetching user simulations");

  const { data, error } = await supabase
    .from("feeding_simulations")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    logger.error({ error: error.message, userId }, "Failed to fetch simulations");
    throw new Error(`Failed to fetch simulations: ${error.message}`);
  }

  logger.info({ count: data?.length || 0, userId }, "Simulations fetched successfully");
  return data;
}
