import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const startedAt = Date.now();

  // Read-only query used only to keep the Supabase project active.
  const { error } = await supabase
    .from("feeding_simulations")
    .select("id")
    .limit(1);

  if (error) {
    throw new Error(`Supabase keepalive failed: ${error.message}`);
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      status: "ok",
      check: "supabase-keepalive",
      table: "feeding_simulations",
      durationMs,
      timestamp: new Date().toISOString(),
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "error",
      check: "supabase-keepalive",
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    })
  );
  process.exit(1);
});
