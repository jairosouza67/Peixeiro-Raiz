import { Card, CardContent } from "@/components/ui/card";
import { Fish, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />
      
      {/* Floating decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      
      <Card className="relative w-full max-w-md mx-4 border-border/60 shadow-2xl shadow-black/10 overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/50 via-destructive to-destructive/50" />
        
        <CardContent className="pt-12 pb-10 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl scale-150" />
            <div className="relative bg-destructive/10 p-4 rounded-2xl border border-destructive/20">
              <Fish className="h-10 w-10 text-destructive" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="font-heading text-7xl font-semibold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground mb-2">Página não encontrada</p>
          <p className="text-sm text-muted-foreground/70 mb-8">
            Parece que você pescou no lugar errado.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild className="group">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Página Inicial
              </Link>
            </Button>
            <Button asChild className="group">
              <Link href="/login">
                <Home className="mr-2 h-4 w-4" />
                Fazer Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
