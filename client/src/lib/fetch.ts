/**
 * Fetch helper with timeout support
 * Prevents requests from hanging indefinitely
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export class FetchTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * Fetch with automatic timeout
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @param timeout - Timeout in milliseconds (default: 30000)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError(url, timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Authenticated fetch with timeout
 * Automatically adds Supabase auth token if available
 */
export async function authenticatedFetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  // Dynamically import to avoid circular dependencies
  const { supabase, isSupabaseConfigured } = await import("./supabase");

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // Add authorization header if user is logged in
  if (isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  return fetchWithTimeout(
    url,
    {
      ...options,
      headers,
    },
    timeout
  );
}
