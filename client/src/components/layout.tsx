import { Link, useLocation } from "wouter";
import { Fish, Calculator, History, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Calculadora", icon: Calculator, href: "/calculator" },
    { label: "Histórico", icon: History, href: "/history" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 text-primary">
          <Fish className="h-6 w-6" />
          <span className="font-heading font-bold text-lg uppercase tracking-wide">O Peixeiro Raiz</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 border-r border-sidebar-border shadow-xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex flex-col gap-6 mb-10">
            <div className="relative h-24 w-full rounded-xl overflow-hidden shadow-lg border border-sidebar-border/50">
              <img
                src="/favicon.png"
                alt="Peixeiro Raiz Logo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                <span className="text-white font-heading font-bold text-lg leading-tight uppercase tracking-wider">Peixeiro Raiz</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-primary-foreground px-2">
              <div className="bg-primary p-2 rounded-lg shadow-md shadow-primary/20">
                <Fish className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm uppercase leading-none">Painel de</span>
                <span className="text-xs uppercase tracking-[0.2em] opacity-70">Controle</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group",
                  location === item.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    location === item.href
                      ? "text-white"
                      : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
                  )}
                />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-sidebar-accent/50 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                JD
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">João Do Peixe</span>
                <span className="text-xs text-muted-foreground truncate">Plano Pro</span>
              </div>
            </div>
            <Link href="/">
              <span className="flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:text-destructive/80 transition-colors cursor-pointer">
                <LogOut className="h-4 w-4" />
                Sair
              </span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background/50 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-[-1] opacity-5 pointer-events-none bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:20px_20px]"></div>

        <div className="container mx-auto max-w-6xl p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
