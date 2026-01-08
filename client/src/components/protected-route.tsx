import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Admin emails with full access (bypass subscription check)
const ADMIN_EMAILS = ['jairosouza67@gmail.com'];

export function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/" />;
    }

    return <Route path={path} component={Component as any} />;
}
