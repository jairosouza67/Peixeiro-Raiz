/**
 * CORS helper for Supabase Edge Functions
 * Restricts origins to allowed list from environment variable
 */

// Get allowed origins from environment (comma-separated)
function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const origins = raw.split(",").map((o) => o.trim()).filter(Boolean);
  
  // Fallback to localhost for development if no origins configured
  if (origins.length === 0) {
    return ["http://localhost:5000", "http://127.0.0.1:5000"];
  }
  
  return origins;
}

/**
 * Get CORS headers for a given request origin
 * Only allows origins in the ALLOWED_ORIGINS list
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  // If origin is in allowed list, use it; otherwise use first allowed origin
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
  status: number, 
  body: unknown, 
  requestOrigin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create an OPTIONS response for CORS preflight
 */
export function corsPreflightResponse(requestOrigin: string | null): Response {
  return new Response("ok", {
    headers: getCorsHeaders(requestOrigin),
  });
}
