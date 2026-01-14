import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetch";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type AccessStatus = "granted" | "blocked" | "loading";

interface AccessCheckResult {
    access: "granted" | "blocked";
    reason?: string;
}

/**
 * Check user access via backend API
 * This validates subscription status server-side (more secure than client-side check)
 */
async function checkAccessViaBackend(): Promise<AccessCheckResult> {
    try {
        if (!isSupabaseConfigured()) {
            return { access: "blocked", reason: "supabase_not_configured" };
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
            return { access: "blocked", reason: "no_session" };
        }

        const response = await fetchWithTimeout(
            "/api/auth/access",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
            },
            10000 // 10 second timeout for access check
        );

        if (!response.ok) {
            // If backend is unavailable, fallback to client-side check
            if (response.status >= 500) {
                return await fallbackClientSideCheck(session.user.id);
            }
            return { access: "blocked", reason: "api_error" };
        }

        const result = await response.json() as AccessCheckResult;
        return result;
    } catch (error) {
        // Network error - try fallback
        if (import.meta.env.DEV) {
            console.warn("[ProtectedRoute] Backend access check failed, using fallback:", error);
        }
        
        // Try to get user ID for fallback
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                return await fallbackClientSideCheck(session.user.id);
            }
        } catch {
            // Ignore fallback errors
        }
        
        return { access: "blocked", reason: "network_error" };
    }
}

/**
 * Fallback: client-side subscription check (for when backend is unavailable)
 */
async function fallbackClientSideCheck(userId: string): Promise<AccessCheckResult> {
    try {
        const { data, error } = await supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", userId)
            .maybeSingle();

        if (error || !data) {
            return { access: "blocked", reason: "no_subscription" };
        }

        return {
            access: data.status === "active" ? "granted" : "blocked",
            reason: data.status === "active" ? "active_subscription" : "blocked_subscription",
        };
    } catch {
        return { access: "blocked", reason: "fallback_error" };
    }
}

export function ProtectedRoute({
    path,
    component: Component,
    requireActiveSubscription = true,
}: {
    path: string;
    component: React.ComponentType;
    requireActiveSubscription?: boolean;
}) {
    const { user, loading } = useAuth();
    const [accessStatus, setAccessStatus] = useState<AccessStatus>("loading");

    useEffect(() => {
        let cancelled = false;

        async function checkAccess() {
            if (!user) {
                if (!cancelled) {
                    setAccessStatus("blocked");
                }
                return;
            }

            if (!requireActiveSubscription) {
                if (!cancelled) {
                    setAccessStatus("granted");
                }
                return;
            }

            // Check access via backend (includes admin check server-side)
            const result = await checkAccessViaBackend();

            if (!cancelled) {
                setAccessStatus(result.access);
            }
        }

        if (loading) return;
        void checkAccess();

        return () => {
            cancelled = true;
        };
    }, [user, loading, requireActiveSubscription]);

    if (loading || accessStatus === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/login" />;
    }

    if (requireActiveSubscription && accessStatus !== "granted") {
        return <Redirect to="/" />;
    }

    return <Route path={path} component={Component as any} />;
}
