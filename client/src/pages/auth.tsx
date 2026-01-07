import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Fish, Lock } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import bgImage from "@assets/generated_images/minimalist_deep_blue_water_surface_pattern.png";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth delay
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Bem-vindo de volta",
        description: "Login realizado com sucesso.",
      });
      setLocation("/paywall"); // Per MVP flow: Login -> Paywall check
    }, 1000);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Branding & Visuals */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-primary/90">
        <div className="absolute inset-0 z-0">
          <img 
            src={bgImage} 
            alt="Background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-sidebar" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20">
            <Fish className="h-8 w-8" />
          </div>
          <span className="font-heading text-2xl font-bold tracking-wide">O PEIXEIRO RAIZ</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-heading text-5xl font-bold mb-6 leading-tight">
            Domine sua produção com precisão absoluta.
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Deixe as planilhas complexas para trás. O sistema definitivo para cálculo de biomassa, ração e lucro para o produtor profissional.
          </p>
        </div>

        <div className="relative z-10 text-sm text-white/50">
          &copy; 2026 O Peixeiro Raiz. Todos os direitos reservados.
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">Acesse sua conta</h2>
            <p className="mt-2 text-muted-foreground">Entre com suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" required className="h-12 bg-card" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <a href="#" className="text-sm text-primary hover:underline">Esqueceu?</a>
              </div>
              <Input id="password" type="password" required className="h-12 bg-card" />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar no Sistema"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou</span>
            </div>
          </div>

          <div className="text-center text-sm">
            Não tem uma conta?{" "}
            <a href="#" className="font-medium text-primary hover:underline">
              Criar conta gratuita
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
