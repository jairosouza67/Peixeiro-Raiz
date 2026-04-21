function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default async (req: Request) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const startedAt = Date.now();

    const endpoint = `${supabaseUrl}/rest/v1/feeding_simulations?select=id&limit=1`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Supabase keepalive failed (${response.status}): ${errorBody}`);
    }

    const durationMs = Date.now() - startedAt;

    return new Response(
      JSON.stringify({
        status: "ok",
        check: "supabase-keepalive",
        nextRun: payload?.next_run ?? null,
        durationMs,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        check: "supabase-keepalive",
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
};
