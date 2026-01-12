import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// Admin emails with full access (bypass subscription check)
const ADMIN_EMAILS = ['jairosouza67@gmail.com'];

type SubscriptionStatus = "active" | "blocked";

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
    const [subscriptionLoading, setSubscriptionLoading] = useState<boolean>(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

    const isAdmin = useMemo(() => {
        const email = user?.email ?? "";
        return ADMIN_EMAILS.includes(email);
    }, [user?.email]);

    useEffect(() => {
        let cancelled = false;

        async function fetchSubscription() {
            if (!user || !requireActiveSubscription || isAdmin) {
                if (!cancelled) {
                    setSubscriptionStatus("active");
                    setSubscriptionLoading(false);
                }
                return;
            }

            try {
                setSubscriptionLoading(true);

                const { data, error } = await supabase
                    .from("subscriptions")
                    .select("status")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (error) {
                    console.warn("[Subscription] Failed to load status:", error);
                    if (!cancelled) {
                        setSubscriptionStatus("blocked");
                        setSubscriptionLoading(false);
                    }
                    return;
                }

                // If no row yet, treat as blocked (the Auth hook will ensure default row)
                const status = (data?.status as SubscriptionStatus | undefined) ?? "blocked";

                if (!cancelled) {
                    setSubscriptionStatus(status);
                    setSubscriptionLoading(false);
                }
            } catch (error) {
                console.warn("[Subscription] Failed to load status:", error);
                if (!cancelled) {
                    setSubscriptionStatus("blocked");
                    setSubscriptionLoading(false);
                }
            }
        }

        if (loading) return;
        void fetchSubscription();

        return () => {
            cancelled = true;
        };
    }, [user, loading, requireActiveSubscription, isAdmin]);

    if (loading || subscriptionLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/" />;
    }

    if (requireActiveSubscription && !isAdmin && subscriptionStatus !== "active") {
        return <Redirect to="/paywall" />;
    }

    return <Route path={path} component={Component as any} />;
}
