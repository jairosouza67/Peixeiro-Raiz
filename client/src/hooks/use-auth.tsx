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
        // This update should only succeed if an RLS policy allows it (see docs/supabase_paywall_setup.sql).
        const { error: claimError } = await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("user_id", user.id)
            .eq("status", "blocked");

        if (claimError) {
            // Normal when entitlement isn't active (or policy not installed yet)
            console.debug("[Auth] Subscription claim skipped:", claimError.message ?? claimError);
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
        await supabase.auth.signOut();
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
