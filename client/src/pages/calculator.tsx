import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { calculateSimulation } from "@/lib/engine";
import { SimulationOutput } from "@/lib/types";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Calculator as CalculatorIcon, Fish, Scale, Droplets } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

// Schema matching the spreadsheet inputs
const formSchema = z.object({
  initialWeight: z.coerce.number().min(0.5, "Peso deve ser maior que 0.5g").max(200000, "Peso máximo é 200kg (200.000g)"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0").max(2000000, "Quantidade máxima é 2 milhões de peixes"),
  temperature: z.coerce.number().min(10).max(40),
  feedPrice: z.coerce.number().min(0),
  weeks: z.coerce.number().min(1).max(52),
});

export default function CalculatorPage() {
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialWeight: 10,
      quantity: 1000,
      temperature: 26,
      feedPrice: 4.50,
      weeks: 12,
    },
  });

  const { user } = useAuth();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // OFFLINE MODE: run calculation locally (no API, no Supabase write)
      if (!navigator.onLine) {
        const output = calculateSimulation({
          ...values,
          // calculator form does not ask for phase; keep consistent with API payload
          phase: "Autodetect",
        } as any);

        setResult(output);

        toast({
          title: "Calculado offline",
          description: "Sem internet: o cálculo foi feito no aparelho e não foi salvo no histórico.",
        });

        if (window.innerWidth < 768) {
          setTimeout(() => {
            document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }

        return;
      }

      // Call Supabase Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate`,
        {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              ...values,
              phase: "Autodetect",
            },
          }),
        }
      );

      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.error("Erro ao calcular simulação via API:", response.status);
        }
        toast({
          variant: "destructive",
          title: "Erro ao calcular simulação",
          description: "Tente novamente em alguns instantes.",
        });
        return;
      }

      const data = (await response.json()) as { output: SimulationOutput; engineVersion?: string };
      const output = data.output;
      const engineVersion = data.engineVersion ?? "1.0.0";

      setResult(output);

      // Save directly to Supabase
      if (user) {
        try {
          const { error: saveError } = await supabase
            .from('feeding_simulations')
            .insert({
              user_id: user.id,
              name: `Simulação ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`,
              input: values,
              output: output,
              engine_version: engineVersion,
            });

          if (saveError) {
            if (import.meta.env.DEV) {
              console.error("Erro ao salvar simulação:", saveError.message);
            }
            toast({
              variant: "destructive",
              title: "Erro ao salvar simulação",
              description: "Tente novamente em alguns instantes.",
            });
          }
        } catch (saveError) {
          if (import.meta.env.DEV) {
            console.error("Erro ao salvar simulação:", saveError);
          }
          toast({
            variant: "destructive",
            title: "Erro ao salvar simulação",
            description: "Tente novamente em alguns instantes.",
          });
        }
      }

      toast({
        title: "Cálculo Realizado",
        description: "As projeções foram atualizadas com sucesso.",
      });

      // Smooth scroll to results on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Erro inesperado ao calcular simulação:", error);
      }
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Não foi possível concluir o cálculo. Verifique sua conexão e tente novamente.",
      });
    }
  }

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <div className="animate-float-up">
          <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">Calculadora de arraçoamento</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Preencha os parâmetros para gerar a projeção exata de alimentação.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">

          {/* INPUT FORM */}
          <Card className="lg:col-span-4 h-fit border-border/60 shadow-lg shadow-primary/5 animate-float-up delay-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center gap-2.5 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalculatorIcon className="h-4 w-4 text-primary" />
                </div>
                Parâmetros de Entrada
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                  <FormField
                    control={form.control}
                    name="initialWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso Médio Atual (g)</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input type="number" step="0.1" {...field} className="pl-9 bg-background focus-visible:ring-primary/50 transition-all" />
                            <Scale className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade de Peixes</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input type="number" {...field} className="pl-9 bg-background focus-visible:ring-primary/50 transition-all" />
                            <Fish className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperatura da Água (°C)</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Input type="number" step="0.1" {...field} className="pl-9 bg-background focus-visible:ring-primary/50 transition-all" />
                            <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <Button type="submit" className="w-full text-base font-medium mt-4 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 group">
                    Calcular Projeção
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* RESULTS DASHBOARD */}
          <div className="lg:col-span-8 space-y-6 animate-float-up delay-200" id="results-section">
            {!result ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-gradient-to-br from-muted/5 to-transparent relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`, backgroundSize: '24px 24px'}} />
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
                  <CalculatorIcon className="relative h-16 w-16 mb-4 opacity-30" />
                </div>
                <p className="text-lg font-heading font-medium">Aguardando cálculo...</p>
                <p className="text-sm mt-1">Preencha o formulário e clique em calcular.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                {/* Main Result: Feed Type */}
                <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-xl shadow-primary/10 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <CardContent className="py-10 text-center relative">
                    <p className="text-sm font-medium text-primary uppercase tracking-[0.15em] mb-3">Tipo de Ração Recomendada</p>
                    <h2 className="text-3xl md:text-5xl font-heading font-semibold text-foreground">
                      {result.feedType}
                    </h2>
                  </CardContent>
                </Card>

                {/* Two main metrics side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Grams per Feeding */}
                  <Card className="border-border/50 shadow-lg shadow-black/5 overflow-hidden relative group hover:shadow-xl transition-shadow duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.08] group-hover:scale-110 group-hover:opacity-15 transition-all duration-300">
                      <Scale className="h-14 w-14 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-[0.12em]">Gramas por Trato</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-4xl md:text-5xl font-heading font-semibold text-foreground">
                          {result.feedPerFeeding.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-base text-muted-foreground">gramas</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Times per Day */}
                  <Card className="border-border/50 shadow-lg shadow-black/5 overflow-hidden relative group hover:shadow-xl transition-shadow duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.08] group-hover:scale-110 group-hover:opacity-15 transition-all duration-300">
                      <Fish className="h-14 w-14 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-[0.12em]">Tratos por Dia</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-4xl md:text-5xl font-heading font-semibold text-foreground">
                          {result.dailyFeedings}
                        </span>
                        <span className="text-base text-muted-foreground">vezes ao dia</span>
                      </div>
                    </CardContent>
                  </Card>

                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function KPICard({ title, value, icon: Icon, trend, highlight = false }: { title: string, value: string, icon: any, trend: string, highlight?: boolean }) {
  return (
    <Card className={cn("border shadow-sm", highlight ? "border-primary/40 bg-primary/5" : "border-border")}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="space-y-1">
          <span className="text-xl md:text-2xl font-bold text-foreground block">{value}</span>
          <p className="text-xs text-muted-foreground/80">{trend}</p>
        </div>
      </CardContent>
    </Card>
  );
}
import { cn } from "@/lib/utils";
