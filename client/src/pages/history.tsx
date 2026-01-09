import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { History, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import HistoryCalculatorModal from "@/components/history-calculator-modal";
import { Dialog } from "@/components/ui/dialog";

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: simulations, isLoading } = useQuery({
    queryKey: ["simulations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('feeding_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error("Erro ao carregar histórico:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar histórico",
          description: "Tente novamente em alguns instantes.",
        });
        throw new Error("Failed to fetch simulations");
      }

      return data || [];
    },
    enabled: !!user,
  });

  const [selected, setSelected] = React.useState<any | null>(null);
  const [open, setOpen] = React.useState(false);

  function openSimulation(sim: any) {
    setSelected(sim);
    setOpen(true);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Histórico de Simulações</h1>
            <p className="text-muted-foreground mt-1">
              Acesse e compare seus cenários salvos.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar simulação..." className="pl-9" />
          </div>
        </div>

        <Card>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !simulations || simulations.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>Nenhuma simulação encontrada.</p>
              </div>
            ) : (
              simulations?.map((item: any) => (
                <div key={item.id} className="p-6 hover:bg-muted/5 transition-colors cursor-pointer" onClick={() => openSimulation(item)}>
                  <div className="mb-4">
                    <div className="rounded-md border border-border bg-slate-50 p-4 text-center">
                      <div className="text-xs text-muted-foreground">TIPO DE RAÇÃO RECOMENDADA</div>
                      <div className="mt-2 text-lg font-bold text-foreground">{(item.output as any)?.feedType ?? "-"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    <div className="rounded-md bg-white p-4 shadow-sm">
                      <div className="text-xs text-muted-foreground">GRAMAS POR TRATO</div>
                      <div className="mt-2 text-2xl font-semibold">{(item.output as any)?.feedPerFeeding ?? "-"}</div>
                      <div className="text-sm text-muted-foreground">grams</div>
                    </div>

                    <div className="rounded-md bg-white p-4 shadow-sm">
                      <div className="text-xs text-muted-foreground">TRATOS POR DIA</div>
                      <div className="mt-2 text-2xl font-semibold">{(item.output as any)?.dailyFeedings ?? "-"}</div>
                      <div className="text-sm text-muted-foreground">vezes ao dia</div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="p-8 text-center text-muted-foreground border-t border-dashed">
              <p className="text-sm">Fim do histórico.</p>
            </div>
          </div>
        </Card>
        <HistoryCalculatorModal open={open} onOpenChange={setOpen} simulation={selected} />
      </div>
    </Layout>
  );
}
