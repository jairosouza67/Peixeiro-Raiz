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
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar histórico:", error.message);
        }
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
        if (import.meta.env.DEV) {
          console.error("Erro ao deletar simulação:", error.message);
        }
        toast({ variant: "destructive", title: "Erro ao deletar", description: "Tente novamente." });
        return;
      }

      // invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["simulations", user?.id] });
      if (selected?.id === id) {
        setSelected(null);
        setOpen(false);
      }
      toast({ title: "Simulação removida" });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro inesperado ao deletar:", err);
      }
      toast({ variant: "destructive", title: "Erro inesperado" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-float-up">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 mb-4">
              <History className="h-3.5 w-3.5" />
              <span>Suas Simulações</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">Histórico</h1>
            <p className="text-muted-foreground mt-1">
              Acesse e compare seus cenários salvos.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar simulação..." className="pl-10 h-11 bg-card/50 border-border/60 focus:border-primary/50" />
          </div>
        </div>

        <Card className="border-border/60 shadow-lg shadow-black/5 overflow-hidden animate-float-up delay-100">
          <div className="divide-y divide-border/50">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : !simulations || simulations.length === 0 ? (
              <div className="p-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <History className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-heading font-medium text-foreground">Nenhuma simulação ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Suas simulações aparecerão aqui.</p>
              </div>
            ) : (
              simulations?.map((item: any, index: number) => (
                <div 
                  key={item.id} 
                  className="p-4 hover:bg-muted/30 transition-all duration-200 cursor-pointer relative group" 
                  onClick={() => openSimulation(item)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="absolute right-4 top-4 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, item.id)}
                      aria-label="Excluir simulação"
                      className="bg-destructive/10 hover:bg-destructive/20 h-8 w-8"
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-foreground truncate pr-8">{item.name}</div>
                    <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">{format(new Date(item.date), "dd/MM 'às' HH:mm", { locale: ptBR })}</div>
                  </div>

                  <div className="mb-3">
                    <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 text-center">
                      <div className="text-[10px] text-primary uppercase tracking-[0.15em] font-medium">Tipo de Ração</div>
                      <div className="mt-1 text-base font-heading font-semibold text-foreground">{(item.output as any)?.feedType ?? "-"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Gramas/Trato</div>
                      <div className="mt-1 text-xl font-heading font-semibold">{(item.output as any)?.feedPerFeeding ?? "-"}</div>
                    </div>

                    <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tratos/Dia</div>
                      <div className="mt-1 text-xl font-heading font-semibold">{(item.output as any)?.dailyFeedings ?? "-"}</div>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="p-6 text-center text-muted-foreground/60 border-t border-dashed border-border/50 bg-muted/20">
              <p className="text-xs uppercase tracking-wider">Fim do histórico</p>
            </div>
          </div>
        </Card>
        <HistoryCalculatorModal open={open} onOpenChange={setOpen} simulation={selected} />
      </div>
    </Layout>
  );
}
