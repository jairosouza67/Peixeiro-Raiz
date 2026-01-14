import { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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

/**
 * Get admin emails from environment variable
 * Format: comma-separated list of emails
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check if an email is in the admin list
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

export interface AccessCheckResult {
  access: "granted" | "blocked";
  reason?: "admin" | "active_subscription" | "no_subscription" | "blocked_subscription";
  subscriptionStatus?: string;
}

/**
 * Check user access (admin or active subscription)
 */
export async function checkUserAccess(
  userId: string,
  email?: string
): Promise<AccessCheckResult> {
  // Check admin bypass first
  if (isAdminEmail(email)) {
    return { access: "granted", reason: "admin" };
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logger.error({ error: error.message, userId }, "Failed to check subscription");
      return { access: "blocked", reason: "no_subscription" };
    }

    if (!data) {
      return { access: "blocked", reason: "no_subscription" };
    }

    if (data.status === "active") {
      return { 
        access: "granted", 
        reason: "active_subscription",
        subscriptionStatus: data.status 
      };
    }

    return { 
      access: "blocked", 
      reason: "blocked_subscription",
      subscriptionStatus: data.status 
    };
  } catch (error) {
    logger.error({ error, userId }, "Error checking user access");
    return { access: "blocked", reason: "no_subscription" };
  }
}

/**
 * Middleware to require active subscription or admin status
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id;
  const email = req.user?.email;

  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const result = await checkUserAccess(userId, email);

  if (result.access === "granted") {
    next();
    return;
  }

  res.status(403).json({ 
    message: "Active subscription required",
    reason: result.reason 
  });
}
