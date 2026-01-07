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
import { ArrowRight, Calculator as CalculatorIcon, DollarSign, Fish, Scale, TrendingUp, Droplets } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema matching the spreadsheet inputs
const formSchema = z.object({
  initialWeight: z.coerce.number().min(0.1, "Peso deve ser maior que 0"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  phase: z.string().min(1, "Selecione a fase"),
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
      quantity: 5000,
      phase: "Recria",
      temperature: 28,
      feedPrice: 4.50,
      weeks: 12,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const output = calculateSimulation(values);
    setResult(output);
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
                        <FormLabel>Peso Médio Inicial (g)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" step="0.1" {...field} className="pl-9" />
                            <Scale className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
                          <div className="relative">
                            <Input type="number" {...field} className="pl-9" />
                            <Fish className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fase</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Berçário">Berçário</SelectItem>
                              <SelectItem value="Recria">Recria</SelectItem>
                              <SelectItem value="Engorda">Engorda</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temp. Água (°C)</FormLabel>
                          <FormControl>
                             <div className="relative">
                              <Input type="number" step="0.1" {...field} className="pl-9" />
                              <Droplets className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="feedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Ração (R$/kg)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.01" {...field} className="pl-9" />
                              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weeks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projeção (Semanas)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                
                {/* Immediate KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard 
                    title="Biomassa Atual" 
                    value={`${result.biomass.toLocaleString('pt-BR')} kg`}
                    icon={Fish}
                    trend="Estoque Vivo"
                  />
                  <KPICard 
                    title="Ração Diária" 
                    value={`${result.dailyFeed.toLocaleString('pt-BR')} kg`}
                    icon={Scale}
                    trend={`${result.dailyFeedings} tratos de ${result.feedPerFeeding}kg`}
                    highlight
                  />
                  <KPICard 
                    title="Custo Diário" 
                    value={`R$ ${result.dailyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    trend="Custo Operacional"
                  />
                   <KPICard 
                    title="Conversão (CA)" 
                    value={result.fcr.toFixed(2)}
                    icon={TrendingUp}
                    trend="Estimado"
                  />
                </div>

                {/* Main Chart */}
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle>Projeção de Crescimento e Consumo</CardTitle>
                    <CardDescription>Evolução semanal da biomassa vs consumo acumulado</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={result.projections}>
                        <defs>
                          <linearGradient id="colorBiomass" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} tickFormatter={(value) => `Sem ${value}`} style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent-foreground))" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area type="monotone" dataKey="biomass" name="Biomassa (kg)" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorBiomass)" yAxisId="left" strokeWidth={2} />
                        <Area type="monotone" dataKey="accumulatedConsumption" name="Ração Acum. (kg)" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorCost)" yAxisId="right" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly Table */}
                <Card className="border-border shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b py-4">
                    <CardTitle className="text-lg">Tabela Detalhada</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                        <tr>
                          <th className="px-4 py-3">Semana</th>
                          <th className="px-4 py-3">Peso Médio (g)</th>
                          <th className="px-4 py-3">Biomassa (kg)</th>
                          <th className="px-4 py-3">Ração Semanal (kg)</th>
                          <th className="px-4 py-3">Custo (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.projections.map((row) => (
                          <tr key={row.week} className="hover:bg-muted/5 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">Semana {row.week}</td>
                            <td className="px-4 py-3">{row.averageWeight.toFixed(1)}</td>
                            <td className="px-4 py-3 font-medium text-primary">{row.biomass.toFixed(1)}</td>
                            <td className="px-4 py-3">{row.feedConsumption.toFixed(1)}</td>
                            <td className="px-4 py-3 text-muted-foreground">R$ {row.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

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
