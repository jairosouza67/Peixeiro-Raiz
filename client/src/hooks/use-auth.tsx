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
