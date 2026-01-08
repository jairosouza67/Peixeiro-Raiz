import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Admin emails with full access (bypass subscription check)
const ADMIN_EMAILS = ['jairosouza67@gmail.com'];

export function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
    const { user, loading } = useAuth();
    const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
    const [checkingSub, setCheckingSub] = useState(true);

    useEffect(() => {
        if (user) {
            // Check if user is admin (full access)
            if (ADMIN_EMAILS.includes(user.email || '')) {
                setHasSubscription(true);
                setCheckingSub(false);
                return;
            }

            const checkSub = async () => {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('status')
                    .eq('userId', user.id)
                    .single();

                if (data && data.status === 'active') {
                    setHasSubscription(true);
                } else {
                    setHasSubscription(false);
                }
                setCheckingSub(false);
            };
            checkSub();
        } else {
            setCheckingSub(false);
        }
    }, [user]);

    if (loading || checkingSub) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/" />;
    }

    if (hasSubscription === false && path !== "/paywall") {
        return <Redirect to="/paywall" />;
    }

    return <Route path={path} component={Component as any} />;
}
