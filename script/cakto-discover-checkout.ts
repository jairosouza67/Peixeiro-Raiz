type Json = Record<string, any>;

const CAKTO_BASE_URL = process.env.CAKTO_BASE_URL ?? "https://api.cakto.com.br";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Missing env var: ${name}`);
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
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await readJsonSafe(res);
  if (!res.ok) throw new Error(`Cakto token failed (${res.status}): ${JSON.stringify(json)}`);

  const token = json.access_token ?? json.token ?? json?.data?.access_token;
  if (!token || typeof token !== "string") throw new Error(`Unexpected token response: ${JSON.stringify(json)}`);
  return token;
}

async function caktoGet(token: string, path: string, query?: Record<string, string | number | boolean>): Promise<Json> {
  const url = new URL(`${CAKTO_BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await readJsonSafe(res);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${JSON.stringify(json)}`);
  return json;
}

async function probeUrl(url: string): Promise<{ url: string; ok: boolean; status: number; location?: string | null }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    const location = res.headers.get("location");

    // pay.cakto.com.br normalmente responde 200 ou 301/302
    const ok = res.status === 200 || res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308;
    return { url, ok, status: res.status, location };
  } catch {
    return { url, ok: false, status: 0 };
  }
}

async function main() {
  const token = await getAccessToken();

  const productId = process.env.CAKTO_PRODUCT_ID?.trim() || null;
  const offersQuery: Record<string, string | number | boolean> = { status: "active", limit: 100, ordering: "-createdAt" };
  if (productId) offersQuery.product = productId;

  const offers = await caktoGet(token, "/public_api/offers/", offersQuery);
  const offerResults: any[] = Array.isArray(offers?.results) ? offers.results : [];

  if (offerResults.length === 0) {
    console.log("No active offers found.");
    console.log("Tip: set CAKTO_PRODUCT_ID to filter offers for a specific product.");
    const products = await caktoGet(token, "/public_api/products/", { status: "active", limit: 50, ordering: "-createdAt" });
    console.log("Active products (first 50):");
    const productResults: any[] = Array.isArray(products?.results) ? products.results : [];
    for (const p of productResults) {
      console.log(`- id=${p?.id} name=${p?.name} type=${p?.type} short_id=${p?.short_id ?? ""}`);
    }
    process.exit(1);
  }

  console.log(`Found ${offerResults.length} active offer(s).`);

  // Candidatos (a API de offers não expõe checkoutUrl diretamente na doc, então tentamos derivar)
  const candidates: string[] = [];
  for (const offer of offerResults.slice(0, 10)) {
    const offerId = offer?.id;
    const product = offer?.product;

    if (typeof offer?.checkoutUrl === "string") candidates.push(offer.checkoutUrl);
    if (typeof offerId === "string" && offerId.length > 0) {
      candidates.push(`https://pay.cakto.com.br/${offerId}`);
    }

    // Alguns payloads podem trazer short_id
    const offerShortId = offer?.short_id;
    if (typeof offerShortId === "string" && offerShortId.length > 0) {
      candidates.push(`https://pay.cakto.com.br/${offerShortId}`);
    }

    // Se o campo product vier como objeto, tenta short_id
    if (product && typeof product === "object") {
      const productShortId = product?.short_id;
      if (typeof productShortId === "string" && productShortId.length > 0) {
        candidates.push(`https://pay.cakto.com.br/${productShortId}`);
      }
    }
  }

  // Remover duplicados
  const uniqueCandidates = Array.from(new Set(candidates));

  if (uniqueCandidates.length === 0) {
    console.log("Could not build any checkout URL candidates from offers.");
    console.log("Try making at least one test order and then read checkoutUrl from /public_api/orders/.");
    process.exit(1);
  }

  console.log("Testing candidates (HTTP status)…");
  const probed = [] as Array<{ url: string; ok: boolean; status: number; location?: string | null }>;
  for (const url of uniqueCandidates) {
    // eslint-disable-next-line no-await-in-loop
    probed.push(await probeUrl(url));
  }

  probed.sort((a, b) => (b.ok ? 1 : 0) - (a.ok ? 1 : 0));

  for (const p of probed) {
    const loc = p.location ? ` -> ${p.location}` : "";
    console.log(`- ${p.status} ${p.ok ? "OK" : ""} ${p.url}${loc}`);
  }

  const best = probed.find((p) => p.ok);
  if (!best) {
    console.log("No candidate responded OK.");
    console.log("Fallback: create a real order and read checkoutUrl from /public_api/orders/.");
    process.exit(1);
  }

  console.log("\nCHECKOUT_URL (use this in Netlify as VITE_CAKTO_CHECKOUT_URL):");
  console.log(best.url);
}

main().catch((err) => {
  console.error("[cakto-discover-checkout] ERROR:", err);
  process.exit(1);
});
