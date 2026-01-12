import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function syncUserToDb(user: User) {
    try {
        const fullName = (user.user_metadata as any)?.full_name ?? null;
        const email = user.email ?? null;

        const { error } = await supabase
            .from("users")
            .upsert(
                {
                    id: user.id,
                    email,
                    full_name: fullName,
                },
                { onConflict: "id" }
            );

        if (error) {
            console.warn("[Auth] Failed to sync user row:", error);
        }

        // Ensure default subscription row exists (blocked) for paywall logic.
        // This assumes RLS allows the authenticated user to insert/select their own row.
        const { data: existingSub, error: subSelectError } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (subSelectError) {
            console.warn("[Auth] Failed to check subscription row:", subSelectError);
            return;
        }

        if (!existingSub?.id) {
            const { error: subInsertError } = await supabase.from("subscriptions").insert({
                user_id: user.id,
                status: "blocked",
                updated_at: new Date().toISOString(),
            });

            if (subInsertError) {
                console.warn("[Auth] Failed to create default subscription row:", subInsertError);
            }
        }

        // If the user already bought on Cakto before creating/logging into the app,
        // the webhook stores an entitlement by email. Here we try to "claim" it.
        // First check if there's an active entitlement for this user's email to avoid unnecessary 403 errors.
        if (email) {
            const { data: entitlement } = await supabase
                .from("cakto_entitlements")
                .select("status")
                .eq("email", email)
                .eq("status", "active")
                .maybeSingle();

            // Only attempt to claim if there's an active entitlement
            if (entitlement?.status === "active") {
                const { error: claimError } = await supabase
                    .from("subscriptions")
                    .update({ status: "active" })
                    .eq("user_id", user.id)
                    .eq("status", "blocked");

                if (claimError) {
                    console.debug("[Auth] Subscription claim failed:", claimError.message ?? claimError);
                }
            }
        }
    } catch (error) {
        console.warn("[Auth] Failed to sync user row:", error);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip auth if Supabase is not configured
        if (!isSupabaseConfigured()) {
            console.warn("[Auth] Supabase not configured, auth features disabled");
            setUser(null);
            setLoading(false);
            return;
        }

        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                void syncUserToDb(session.user);
            }
            setLoading(false);
        }).catch((error) => {
            console.error("[Auth] Failed to get session:", error);
            setUser(null);
            setLoading(false);
        });

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                void syncUserToDb(session.user);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        if (!isSupabaseConfigured()) {
            console.warn("[Auth] Cannot sign out, Supabase not configured");
            return;
        }
        try {
            // Use 'local' scope to avoid 403 errors on global logout
            await supabase.auth.signOut({ scope: 'local' });
        } catch (error) {
            // Even if the server-side logout fails (403), clear local session
            console.warn("[Auth] Sign out error (clearing local session anyway):", error);
        }
        // Always clear local state to ensure UI updates
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
