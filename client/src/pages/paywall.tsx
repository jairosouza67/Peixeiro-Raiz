import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ShieldCheck, Zap } from "lucide-react";
import { useLocation } from "wouter";
import bgImage from "@assets/generated_images/minimalist_deep_blue_water_surface_pattern.png";

export default function PaywallPage() {
  const [, setLocation] = useLocation();

  const handleSubscribe = () => {
    // Mock subscription logic
    setLocation("/calculator");
  };

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
         <img 
            src={bgImage} 
            alt="Background" 
            className="w-full h-full object-cover opacity-5 grayscale"
          />
      </div>

      <div className="relative z-10 max-w-5xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* Value Prop */}
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Zap className="h-4 w-4" />
            <span>Acesso Antecipado</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Desbloqueie o Poder do <span className="text-primary">Motor de Precisão</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Pare de perder dinheiro com estimativas. Tenha acesso à ferramenta oficial que replica a lógica exata das planilhas de alta performance, agora na nuvem.
          </p>
          
          <div className="space-y-3 pt-4">
            {[
              "Motor de cálculo validado célula por célula",
              "Projeções financeiras semanais",
              "Simulações ilimitadas",
              "Acesso em qualquer dispositivo (Mobile/PC)"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <Card className="border-primary/20 shadow-2xl shadow-primary/10 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck className="h-32 w-32 -rotate-12" />
          </div>
          
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-heading text-2xl uppercase tracking-wider text-muted-foreground">Assinatura Pro</CardTitle>
            <div className="flex items-baseline justify-center gap-1 mt-4">
              <span className="text-sm text-muted-foreground align-top">R$</span>
              <span className="text-5xl font-bold text-foreground">49</span>
              <span className="text-xl text-muted-foreground">,90</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <CardDescription className="mt-2">Cancele quando quiser. Sem fidelidade.</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Button size="lg" className="w-full text-lg h-14 shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all" onClick={handleSubscribe}>
              Liberar Acesso Agora
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Pagamento processado de forma 100% segura via Stripe.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
