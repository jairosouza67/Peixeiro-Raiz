import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global error boundary to catch rendering errors and show a fallback UI
 * instead of crashing the entire app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // You can log to an external service here (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
          <Card className="w-full max-w-2xl border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Algo deu errado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Desculpe, ocorreu um erro inesperado ao renderizar esta página.
              </p>

              {this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Detalhes técnicos (para desenvolvedores)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto max-h-60">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {"\n\n"}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 mt-6">
                <Button onClick={this.handleReset} variant="default">
                  Tentar novamente
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                >
                  Voltar para a página inicial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
