import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, Fish, Calculator as CalculatorIcon } from "lucide-react";

export default function HistoryCalculatorModal({ open, onOpenChange, simulation }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  simulation: any | null;
}) {
  if (!simulation) return null;

  const output = simulation.output || {};
  const input = simulation.input || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Visualizar Simulação</DialogTitle>
          <DialogDescription>Dados da calculadora para esta simulação</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="py-4">
              <div className="text-sm text-muted-foreground">Parâmetros de Entrada</div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Peso Médio Atual (g)</div>
                  <div className="font-medium">{input.initialWeight ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Quantidade</div>
                  <div className="font-medium">{input.quantity ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Temperatura (°C)</div>
                  <div className="font-medium">{input.temperature ?? "-"}</div>
                </div>
                
              </div>
            </CardContent>
          </Card>

          <div>
            <Card className="border-primary bg-primary/10">
              <CardContent className="py-6 text-center">
                <div className="text-sm font-medium text-primary uppercase tracking-wider">Tipo de Ração Recomendada</div>
                <div className="text-2xl font-bold mt-2">{output.feedType ?? "-"}</div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="p-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground">Gramas por Trato</div>
                  <div className="text-2xl font-semibold">{output.feedPerFeeding ?? "-"}</div>
                  <div className="text-sm text-muted-foreground">grams</div>
                </CardContent>
              </Card>

              <Card className="p-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground">Tratos por Dia</div>
                  <div className="text-2xl font-semibold">{output.dailyFeedings ?? "-"}</div>
                  <div className="text-sm text-muted-foreground">vezes ao dia</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
