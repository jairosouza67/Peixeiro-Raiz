import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, LogOut, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import bgImage from "@assets/generated_images/minimalist_deep_blue_water_surface_pattern.png";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function PaywallPage() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [checkingAccess, setCheckingAccess] = useState(false);

  const handleSubscribe = () => {
    const checkoutUrl = import.meta.env.VITE_CAKTO_CHECKOUT_URL_ANUAL as string | undefined;

    if (!checkoutUrl) {
      if (import.meta.env.DEV) {
        console.warn("[Paywall] Missing VITE_CAKTO_CHECKOUT_URL_ANUAL");
      }
      toast({
        variant: "destructive",
        title: "Erro ao abrir checkout",
        description: "URL de pagamento não configurada. Tente novamente mais tarde.",
      });
      return;
    }

    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const handleRevalidateAccess = async () => {
    if (!user?.id) {
      setLocation("/login");
      return;
    }

    try {
      setCheckingAccess(true);

      // Try to claim access (blocked -> active). This should only succeed if your RLS policy
      // allows it (see docs/supabase_paywall_setup.sql) and there is an active entitlement.
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("user_id", user.id)
        .eq("status", "blocked");

      const { data, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast({
          variant: "destructive",
          title: "Não foi possível validar o acesso",
          description: error.message,
        });
        return;
      }

      if (data?.status === "active") {
        toast({
          title: "Acesso liberado",
          description: "Assinatura ativa. Redirecionando…",
        });
        setLocation("/calculator");
        return;
      }

      toast({
        title: "Acesso ainda bloqueado",
        description: "Se você acabou de pagar, aguarde alguns segundos e tente novamente.",
      });
    } finally {
      setCheckingAccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Layered Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <img
          src={bgImage}
          alt=""
          className="w-full h-full object-cover opacity-[0.03] animate-wave"
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">

        {/* Value Prop */}
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/15 to-primary/5 text-primary text-sm font-medium border border-primary/20 animate-float-up">
            <Zap className="h-4 w-4" />
            <span>Acesso Antecipado</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-[1.15] animate-float-up delay-100">
            A maneira mais Fácil de calcular a ração da sua <span className="text-primary relative">
              criação de Tilápias
              <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary/30" viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M0 7 Q50 0 100 7 T200 7" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg animate-float-up delay-200">
            Ferramenta desenvolvida por engenheiro de pesca para facilitar o manejo de pequenos criadores. Reduza desperdícios, acelere o crescimento das tilápias e aumente seu lucro com alimentação correta.
          </p>

          <div className="space-y-4 pt-4 animate-float-up delay-300">
            {[
              "Alimente com precisão",
              "Crescimento mais rápido e uniforme",
              "Economia imediata de ração",
              "Mais segurança e tranquilidade no manejo"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
                </div>
                <span className="text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <Card className="border-primary/20 shadow-2xl shadow-primary/15 bg-card/90 backdrop-blur-md relative overflow-hidden animate-scale-in delay-200">
          <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
            <ShieldCheck className="h-40 w-40 -rotate-12" />
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

          <CardHeader className="text-center pb-2 pt-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50 text-accent-foreground text-xs font-medium mx-auto mb-4">
              <span>🔥 Oferta de lançamento</span>
            </div>
            <CardTitle className="font-heading text-xl uppercase tracking-[0.2em] text-muted-foreground">Assinatura Anual</CardTitle>

            {/* Preço Anual */}
            <div className="mt-6 p-4 rounded-lg border-2 border-primary/60 bg-primary/5 ring-2 ring-primary/20 w-full">
              <div className="text-center mb-3">
                <span className="text-3xl md:text-4xl font-bold text-foreground">Menos de R$ 0,13</span>
                <span className="text-lg text-muted-foreground ml-2">/dia</span>
              </div>
              <div className="pt-3 border-t border-border/30 text-center">
                <span className="text-sm text-muted-foreground">R$ 47,00</span>
                <span className="text-xs text-muted-foreground/70 ml-1">por 12 meses</span>
              </div>
            </div>

            <CardDescription className="mt-4 text-xs bg-muted/50 rounded-lg px-3 py-2 inline-block">Use o mesmo e-mail do login no checkout</CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-8">
            <Button
              size="lg"
              className="w-full text-lg h-14 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 group"
              onClick={handleSubscribe}
            >
              Assinar Agora
              <Zap className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            </Button>
            <Button
              variant="outline"
              className="w-full mt-3 h-12 border-border/60 hover:bg-muted/50"
              onClick={handleRevalidateAccess}
              disabled={checkingAccess}
            >
              {checkingAccess ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Validando…
                </span>
              ) : "Já paguei / Revalidar acesso"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pagamento seguro via Cakto
            </p>

            <div className="mt-6 pt-6 border-t border-border/50 text-center">
              {user ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground break-all px-2">
                    Logado como <span className="font-medium text-foreground">{user.email}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setLocation("/calculator")}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors py-2 px-3 rounded-md hover:bg-primary/5"
                    >
                      Entrar no sistema →
                    </button>
                    <span className="hidden sm:inline text-muted-foreground/50">|</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setLocation("/login");
                      }}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 py-2 px-3 rounded-md hover:bg-muted/50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Trocar de conta
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Entrar na área de Membros
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
