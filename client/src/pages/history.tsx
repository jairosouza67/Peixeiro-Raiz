import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { History, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HistoryPage() {
  const { user } = useAuth();

  const { data: simulations, isLoading } = useQuery({
    queryKey: ["simulations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feeding_simulations")
        .select("*")
        .eq("userId", user?.id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
            ) : simulations?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>Nenhuma simulação encontrada.</p>
              </div>
            ) : (
              simulations?.map((item: any) => (
                <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/5 transition-colors gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 md:gap-12 text-sm">
                    <div>
                      <span className="block text-xs text-muted-foreground uppercase">Biomassa (kg)</span>
                      <span className="font-medium">{(item.output as any).biomass}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground uppercase">Custo Dia</span>
                      <span className="font-medium">R$ {(item.output as any).dailyCost}</span>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        v{item.engineVersion}
                      </span>
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
      </div>
    </Layout>
  );
}
