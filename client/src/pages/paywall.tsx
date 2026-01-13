import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import bgImage from "@assets/generated_images/minimalist_deep_blue_water_surface_pattern.png";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function PaywallPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [checkingAccess, setCheckingAccess] = useState(false);

  const handleSubscribe = () => {
    const checkoutUrl = import.meta.env.VITE_CAKTO_CHECKOUT_URL as string | undefined;

    if (!checkoutUrl) {
      console.warn("[Paywall] Missing VITE_CAKTO_CHECKOUT_URL");
      return;
    }

    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const handleRevalidateAccess = async () => {
    if (!user?.id) {
      setLocation("/");
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
            <CardTitle className="font-heading text-xl uppercase tracking-[0.2em] text-muted-foreground">Escolha seu plano</CardTitle>
            
            {/* Assinatura Trimestral */}
            <div className="mt-6 p-4 rounded-lg border border-border/50 bg-muted/20">
              <div className="text-sm font-medium text-muted-foreground mb-2">Assinatura Trimestral</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-lg text-muted-foreground align-top">R$</span>
                <span className="text-4xl font-heading font-semibold text-foreground">37</span>
                <span className="text-xl text-muted-foreground">,00</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">por 3 meses de acesso</div>
            </div>
            
            {/* Assinatura Anual */}
            <div className="mt-4 p-4 rounded-lg border-2 border-primary/40 bg-primary/5 relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">Melhor valor</div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Assinatura Anual</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-lg text-muted-foreground align-top">R$</span>
                <span className="text-4xl font-heading font-semibold text-foreground">97</span>
                <span className="text-xl text-muted-foreground">,00</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">por 12 meses de acesso</div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
