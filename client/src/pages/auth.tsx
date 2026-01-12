import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Fish, Waves, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import bgImage from "@assets/generated_images/minimalist_deep_blue_water_surface_pattern.png";

import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // If already authenticated, redirect to calculator
  // Uses the AuthContext state to avoid conflicts with signOut
  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/calculator");
    }
  }, [user, authLoading, setLocation]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const trimmedName = fullName.trim();
        if (!trimmedName) {
          throw new Error("Informe seu nome para criar a conta.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: trimmedName,
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Conta criada",
          description: "Verifique seu email para confirmar o cadastro.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({
          title: "Bem-vindo de volta",
          description: "Login realizado com sucesso.",
        });
        setLocation("/calculator");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na autenticação",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden">
      {/* Left: Immersive Branding Panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        {/* Layered background for depth - Original deep blue */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[hsl(215,50%,15%)] via-[hsl(215,80%,30%)] to-[hsl(215,50%,12%)]" />
        
        {/* Animated water texture overlay */}
        <div className="absolute -inset-[10%] z-[1]">
          <img
            src={bgImage}
            alt=""
            className="w-full h-full object-cover opacity-25 mix-blend-overlay animate-wave"
          />
        </div>
        
        {/* Geometric pattern overlay */}
        <div 
          className="absolute inset-0 z-[2] opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Gradient vignette */}
        <div className="absolute inset-0 z-[3] bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4 animate-float-up">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-xl blur-xl" />
            <div className="relative bg-white/10 p-3 rounded-xl backdrop-blur-md border border-white/20 shadow-2xl">
              <Fish className="h-9 w-9" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <span className="font-heading text-2xl font-semibold tracking-wide block">O PEIXEIRO RAIZ</span>
            <span className="text-xs text-white/50 tracking-[0.2em] uppercase">Manejo Inteligente</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="animate-float-up delay-100">
            <Waves className="h-10 w-10 text-[hsl(215,90%,70%)] mb-4" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-[3.25rem] font-semibold leading-[1.1] animate-float-up delay-200">
            Domine sua produção com precisão absoluta.
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-md animate-float-up delay-300">
            Deixe as planilhas complexas para trás. O sistema definitivo para cálculo de ração do produtor profissional.
          </p>
          
          {/* Stats pills */}
          <div className="flex gap-3 pt-4 animate-float-up delay-400">
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm border border-white/10">
              <span className="text-[hsl(215,90%,75%)] font-medium">+2.500</span>
              <span className="text-white/60 ml-1">produtores</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm border border-white/10">
              <span className="text-[hsl(215,90%,75%)] font-medium">98%</span>
              <span className="text-white/60 ml-1">precisão</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-white/40 animate-float-up delay-500">
          &copy; 2026 O Peixeiro Raiz · Todos os direitos reservados
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="relative flex items-center justify-center p-8 bg-background">
        {/* Subtle background pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        <div className="relative w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 lg:hidden animate-scale-in">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <Fish className="h-7 w-7 text-primary" strokeWidth={1.5} />
            </div>
            <span className="font-heading text-xl font-semibold text-foreground">O PEIXEIRO RAIZ</span>
          </div>
          
          <div className="text-center lg:text-left animate-float-up">
            <h2 className="font-heading text-3xl font-semibold text-foreground">
              {isSignUp ? "Crie sua conta" : "Bem-vindo de volta"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isSignUp ? "Comece a gerenciar seu manejo hoje." : "Entre para continuar seu trabalho."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 animate-float-up delay-100">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Como devemos te chamar?"
                  required
                  className="h-12 bg-card/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="h-12 bg-card/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <button type="button" className="text-sm text-primary/80 hover:text-primary transition-colors">Esqueceu?</button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12 bg-card/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 group" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Criar minha conta" : "Entrar no sistema"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          <div className="relative animate-float-up delay-200">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground/60 tracking-wider">ou</span>
            </div>
          </div>

          <div className="text-center text-sm animate-float-up delay-300">
            <span className="text-muted-foreground">
              {isSignUp ? "Já tem uma conta?" : "Novo por aqui?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFullName("");
              }}
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {isSignUp ? "Fazer login" : "Criar conta gratuita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
