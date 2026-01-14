// @ts-nocheck
// Supabase Edge Function - Cakto Webhook
// Deploy: supabase functions deploy cakto-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

type SubscriptionStatus = "active" | "blocked";

function extractString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapEventToStatus(event: string): SubscriptionStatus | null {
  const allow = new Set(["subscription_created", "subscription_renewed", "purchase_approved"]);
  const block = new Set([
    "subscription_canceled",
    "subscription_renewal_refused",
    "refund",
    "chargeback",
  ]);

  if (allow.has(event)) return "active";
  if (block.has(event)) return "blocked";
  return null;
}

/**
 * Validate webhook timestamp to prevent replay attacks
 * Returns true if timestamp is within acceptable window (5 minutes)
 */
function isTimestampValid(timestamp: unknown): boolean {
  if (!timestamp) return true; // If no timestamp provided, skip validation (backwards compat)
  
  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : 
             typeof timestamp === 'number' ? timestamp : null;
  
  if (!ts || isNaN(ts)) return true; // Invalid timestamp format, skip validation
  
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return Math.abs(now - ts) <= fiveMinutes;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return corsPreflightResponse(origin);
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, origin);
  }

  const webhookSecret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return jsonResponse(500, { error: "Missing CAKTO_WEBHOOK_SECRET" }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, origin);
  }

  try {
    const payload = await req.json();

    const payloadSecret =
      extractString((payload as any)?.secret) ??
      extractString((payload as any)?.fields?.secret) ??
      extractString((payload as any)?.data?.fields?.secret);

    if (!payloadSecret || payloadSecret !== webhookSecret) {
      return jsonResponse(401, { error: "Invalid webhook secret" }, origin);
    }

    // Validate timestamp to prevent replay attacks
    const timestamp = (payload as any)?.timestamp ?? 
                      (payload as any)?.created_at ?? 
                      (payload as any)?.data?.timestamp;
    
    if (!isTimestampValid(timestamp)) {
      return jsonResponse(400, { error: "Webhook timestamp expired or invalid" }, origin);
    }

    const event =
      extractString((payload as any)?.event) ??
      extractString((payload as any)?.type) ??
      extractString((payload as any)?.name);

    if (!event) {
      return jsonResponse(400, { error: "Missing event" }, origin);
    }

    const status = mapEventToStatus(event);
    if (!status) {
      return jsonResponse(200, { ok: true, ignored: true, event }, origin);
    }

    const email =
      extractString((payload as any)?.data?.customer?.email) ??
      extractString((payload as any)?.data?.buyer?.email) ??
      extractString((payload as any)?.customer?.email) ??
      extractString((payload as any)?.buyer?.email);

    if (!email) {
      return jsonResponse(400, { error: "Missing customer email" }, origin);
    }

    const normalizedEmail = normalizeEmail(email);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Persist entitlement by email
    const { error: entitlementError } = await admin.from("cakto_entitlements").upsert(
      {
        email: normalizedEmail,
        status,
        last_event: event,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

    if (entitlementError) {
      return jsonResponse(500, {
        error: "Failed to upsert cakto entitlement",
        details: entitlementError.message,
      }, origin);
    }

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      return jsonResponse(500, { error: "Failed to lookup user", details: userError.message }, origin);
    }

    if (!userRow?.id) {
      return jsonResponse(200, {
        ok: true,
        pendingUser: true,
        email: normalizedEmail,
        status,
        event,
      }, origin);
    }

    // Use UPSERT to avoid race conditions
    const { error: upsertError } = await admin.from("subscriptions").upsert(
      {
        user_id: userRow.id,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      return jsonResponse(500, { error: "Failed to upsert subscription", details: upsertError.message }, origin);
    }

    return jsonResponse(200, { ok: true, upserted: true, status, event }, origin);
  } catch (error) {
    return jsonResponse(500, { error: (error as Error)?.message ?? "Unknown error" }, origin);
  }
});
