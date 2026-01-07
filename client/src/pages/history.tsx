import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HistoryPage() {
  // Mock Data
  const history = [
    { id: 1, name: "Tanque 01 - Lote A", date: "07/01/2026", biomass: "1,250 kg", profit: "R$ 4.200", status: "Active" },
    { id: 2, name: "Tanque 02 - Teste Ração B", date: "05/01/2026", biomass: "890 kg", profit: "R$ 2.800", status: "Archived" },
    { id: 3, name: "Simulação Expansão", date: "02/01/2026", biomass: "5,000 kg", profit: "R$ 15.000", status: "Draft" },
  ];

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
            {history.map((item) => (
              <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/5 transition-colors gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">Criado em {item.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 md:gap-12 text-sm">
                  <div>
                    <span className="block text-xs text-muted-foreground uppercase">Biomassa Final</span>
                    <span className="font-medium">{item.biomass}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground uppercase">Lucro Est.</span>
                    <span className="font-medium">{item.profit}</span>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Empty State visual helper */}
            <div className="p-8 text-center text-muted-foreground border-t border-dashed">
              <p className="text-sm">Fim do histórico.</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
