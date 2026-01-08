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
  initialWeight: z.coerce.number().min(0.5, "Peso deve ser maior que 0.5g"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
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
    const output = calculateSimulation({
      ...values,
      phase: "Autodetect",
    });
    setResult(output);

    // Salvamento automático no Supabase
    if (user) {
      const { error } = await supabase.from('feeding_simulations').insert({
        userId: user.id,
        name: `Simulação ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
        input: values,
        output: output,
        engineVersion: "1.0.0"
      });
      if (error) console.error("Erro ao salvar:", error);
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
  }

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Calculadora de Manejo</h1>
          <p className="text-muted-foreground mt-2">
            Preencha os dados abaixo para gerar a projeção exata baseada no motor 1.0.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">

          {/* INPUT FORM */}
          <Card className="lg:col-span-4 h-fit border-border shadow-md">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5 text-primary" />
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


                  <Button type="submit" className="w-full text-base font-medium mt-4 shadow-md shadow-primary/20 hover:scale-[1.01] transition-transform">
                    Calcular Projeção
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* RESULTS DASHBOARD */}
          <div className="lg:col-span-8 space-y-6" id="results-section">
            {!result ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/5">
                <CalculatorIcon className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Aguardando cálculo...</p>
                <p className="text-sm">Preencha o formulário e clique em calcular.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                {/* Main Result: Feed Type */}
                <Card className="border-primary bg-primary/10 shadow-lg overflow-hidden">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Tipo de Ração Recomendada</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      {result.feedType}
                    </h2>
                  </CardContent>
                </Card>

                {/* Two main metrics side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Grams per Feeding */}
                  <Card className="border-border shadow-md overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Scale className="h-12 w-12 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Gramas por Trato</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-1">
                        <span className="text-4xl md:text-5xl font-bold text-foreground">
                          {result.feedPerFeeding.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-lg text-muted-foreground">gramas</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Times per Day */}
                  <Card className="border-border shadow-md overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Fish className="h-12 w-12 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tratos por Dia</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-1">
                        <span className="text-4xl md:text-5xl font-bold text-foreground">
                          {result.dailyFeedings}
                        </span>
                        <span className="text-lg text-muted-foreground">vezes ao dia</span>
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
