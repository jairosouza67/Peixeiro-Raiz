import { supabase } from "./supabase";

/**
 * Helper to make authenticated API calls with Supabase session token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);

  // Add authorization header if user is logged in
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  headers.set("Content-Type", "application/json");

  return fetch(url, {
    ...options,
    headers,
  });
}
