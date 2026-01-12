type Json = Record<string, any>;

const CAKTO_BASE_URL = process.env.CAKTO_BASE_URL ?? "https://api.cakto.com.br";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value.trim();
}

async function readJsonSafe(res: Response): Promise<Json> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getAccessToken(): Promise<string> {
  const clientId = requiredEnv("CAKTO_CLIENT_ID");
  const clientSecret = requiredEnv("CAKTO_CLIENT_SECRET");

  const url = `${CAKTO_BASE_URL}/public_api/token/`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Cakto token failed (${res.status}): ${JSON.stringify(json)}`);
  }

  const token = json.access_token ?? json.token ?? json?.data?.access_token;
  if (!token || typeof token !== "string") {
    throw new Error(`Unexpected token response: ${JSON.stringify(json)}`);
  }

  return token;
}

function parseCsv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function listWebhooks(token: string): Promise<Json> {
  const url = `${CAKTO_BASE_URL}/public_api/webhook/`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`List webhooks failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function listProducts(token: string, query?: Record<string, string | number | boolean>): Promise<Json> {
  const url = new URL(`${CAKTO_BASE_URL}/public_api/products/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`List products failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function resolveWebhookProducts(token: string): Promise<string[]> {
  const explicit = parseCsv("CAKTO_WEBHOOK_PRODUCTS", []);
  if (explicit.length > 0) return explicit;

  // Prefer active subscription products.
  const preferred = await listProducts(token, { status: "active", type: "subscription", limit: 100 });
  const preferredIds = Array.isArray(preferred?.results)
    ? preferred.results.map((p: any) => p?.id).filter((id: any) => typeof id === "string" && id.length > 0)
    : [];
  if (preferredIds.length > 0) return preferredIds;

  // Fallback: any subscription products.
  const anySub = await listProducts(token, { type: "subscription", limit: 100 });
  const anySubIds = Array.isArray(anySub?.results)
    ? anySub.results.map((p: any) => p?.id).filter((id: any) => typeof id === "string" && id.length > 0)
    : [];
  if (anySubIds.length > 0) return anySubIds;

  // Last resort: all active products.
  const active = await listProducts(token, { status: "active", limit: 100 });
  const activeIds = Array.isArray(active?.results)
    ? active.results.map((p: any) => p?.id).filter((id: any) => typeof id === "string" && id.length > 0)
    : [];
  if (activeIds.length > 0) return activeIds;

  throw new Error(
    "No products found in Cakto. Create at least one product first, or set CAKTO_WEBHOOK_PRODUCTS with product IDs."
  );
}

async function createWebhook(token: string) {
  const webhookUrl = requiredEnv("CAKTO_WEBHOOK_URL");
  const name = process.env.CAKTO_WEBHOOK_NAME?.trim() || "peixeiro-raiz";

  const status = (process.env.CAKTO_WEBHOOK_STATUS?.trim() || "active") as
    | "active"
    | "disabled"
    | "waiting_config";

  // Events in Cakto docs are usually referenced by custom_id; in practice these often match the event string.
  const events = parseCsv("CAKTO_WEBHOOK_EVENTS", [
    "subscription_created",
    "subscription_renewed",
    "purchase_approved",
    "subscription_canceled",
    "subscription_renewal_refused",
    "refund",
    "chargeback",
  ]);

  // Required by Cakto: at least one product id.
  const products = await resolveWebhookProducts(token);

  const url = `${CAKTO_BASE_URL}/public_api/webhook/`;

  const payload: Json = {
    name,
    url: webhookUrl,
    events,
    products,
    status,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await readJsonSafe(res);
  if (!res.ok) {
    throw new Error(`Create webhook failed (${res.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  console.log(`[cakto-setup] baseUrl=${CAKTO_BASE_URL}`);

  const token = await getAccessToken();
  console.log("[cakto-setup] token acquired");

  const before = await listWebhooks(token);
  console.log("[cakto-setup] existing webhooks:");
  console.log(JSON.stringify(before, null, 2));

  const created = await createWebhook(token);
  console.log("[cakto-setup] webhook created:");
  console.log(JSON.stringify(created, null, 2));

  console.log("\nNext:");
  console.log("- Copy the returned fields.secret into Supabase secret CAKTO_WEBHOOK_SECRET");
  console.log("- Trigger a test event in Cakto and confirm subscriptions updates");
}

main().catch((err) => {
  console.error("[cakto-setup] ERROR:", err);
  process.exit(1);
});
