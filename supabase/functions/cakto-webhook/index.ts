// @ts-nocheck
// Supabase Edge Function - Cakto Webhook
// Deploy: supabase functions deploy cakto-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SubscriptionStatus = "active" | "blocked";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const webhookSecret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return jsonResponse(500, { error: "Missing CAKTO_WEBHOOK_SECRET" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const payload = await req.json();

    const payloadSecret =
      extractString((payload as any)?.secret) ??
      extractString((payload as any)?.fields?.secret) ??
      extractString((payload as any)?.data?.fields?.secret);

    if (!payloadSecret || payloadSecret !== webhookSecret) {
      // return 401 to encourage webhook retry only if misconfigured; keep simple
      return jsonResponse(401, { error: "Invalid webhook secret" });
    }

    const event =
      extractString((payload as any)?.event) ??
      extractString((payload as any)?.type) ??
      extractString((payload as any)?.name);

    if (!event) {
      return jsonResponse(400, { error: "Missing event" });
    }

    const status = mapEventToStatus(event);
    if (!status) {
      // Unknown/unhandled events are acknowledged to avoid retries
      return jsonResponse(200, { ok: true, ignored: true, event });
    }

    const email =
      extractString((payload as any)?.data?.customer?.email) ??
      extractString((payload as any)?.data?.buyer?.email) ??
      extractString((payload as any)?.customer?.email) ??
      extractString((payload as any)?.buyer?.email);

    if (!email) {
      return jsonResponse(400, { error: "Missing customer email" });
    }

    const normalizedEmail = normalizeEmail(email);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Persist entitlement by email so we can grant access later even if the user
    // hasn't created an account yet.
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
      });
    }

    // Find user row by email (synced by client on login). If user doesn't exist yet,
    // we acknowledge the webhook but we can't grant access until the user signs up.
    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      return jsonResponse(500, { error: "Failed to lookup user", details: userError.message });
    }

    if (!userRow?.id) {
      return jsonResponse(200, {
        ok: true,
        pendingUser: true,
        email: normalizedEmail,
        status,
        event,
      });
    }

    // Ensure exactly one subscription row per user_id (requires a UNIQUE index on user_id for UPSERT).
    // If the DB doesn't have it yet, we fallback to select+insert/update.
    const { data: existingSub, error: existingError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userRow.id)
      .maybeSingle();

    if (existingError) {
      return jsonResponse(500, { error: "Failed to lookup subscription", details: existingError.message });
    }

    if (!existingSub?.id) {
      const { error: insertError } = await admin.from("subscriptions").insert({
        user_id: userRow.id,
        status,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        return jsonResponse(500, { error: "Failed to create subscription", details: insertError.message });
      }

      return jsonResponse(200, { ok: true, created: true, status, event });
    }

    const { error: updateError } = await admin
      .from("subscriptions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existingSub.id);

    if (updateError) {
      return jsonResponse(500, { error: "Failed to update subscription", details: updateError.message });
    }

    return jsonResponse(200, { ok: true, updated: true, status, event });
  } catch (error) {
    return jsonResponse(500, { error: (error as Error)?.message ?? "Unknown error" });
  }
});
