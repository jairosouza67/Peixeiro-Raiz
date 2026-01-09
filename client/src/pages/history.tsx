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
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

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
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<any | null>(null);
  const [open, setOpen] = React.useState(false);

  function openSimulation(sim: any) {
    setSelected(sim);
    setOpen(true);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();

    const ok = window.confirm("Confirma exclusão desta simulação? Esta ação é irreversível.");
    if (!ok) return;

    try {
      setDeletingId(id);
      const { error } = await supabase.from("feeding_simulations").delete().eq("id", id);
      if (error) {
        console.error("Erro ao deletar simulação:", error);
        toast({ variant: "destructive", title: "Erro ao deletar", description: "Tente novamente." });
        return;
      }

      // invalidate and refetch
      await queryClient.invalidateQueries(["simulations", user?.id]);
      if (selected?.id === id) {
        setSelected(null);
        setOpen(false);
      }
      toast({ title: "Simulação removida" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro inesperado" });
    } finally {
      setDeletingId(null);
    }
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
                <div key={item.id} className="p-3 hover:bg-muted/5 transition-colors cursor-pointer relative group" onClick={() => openSimulation(item)}>
                  <div className="absolute right-3 top-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, item.id)}
                      aria-label="Excluir simulação"
                      className="bg-transparent"
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                  </div>

                  <div className="mb-2">
                    <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-center">
                      <div className="text-xs text-muted-foreground">TIPO DE RAÇÃO RECOMENDADA</div>
                      <div className="mt-1 text-sm font-semibold text-foreground">{(item.output as any)?.feedType ?? "-"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-stretch">
                    <div className="rounded-md bg-white p-3 shadow-sm">
                      <div className="text-xs text-muted-foreground">GRAMAS POR TRATO</div>
                      <div className="mt-1 text-xl font-semibold">{(item.output as any)?.feedPerFeeding ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">grams</div>
                    </div>

                    <div className="rounded-md bg-white p-3 shadow-sm">
                      <div className="text-xs text-muted-foreground">TRATOS POR DIA</div>
                      <div className="mt-1 text-xl font-semibold">{(item.output as any)?.dailyFeedings ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">vezes ao dia</div>
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
