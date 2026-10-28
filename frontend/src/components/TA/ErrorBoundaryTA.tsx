import { Component, type ReactNode } from "react";
import { ButtonTA } from "@/components/TA/ButtonTA";

// TYPES
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  failed: boolean;
}

// COMPONENT
export class ErrorBoundaryTA extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError = (): ErrorBoundaryState => ({
    failed: true,
  });

  render = (): ReactNode =>
    this.state.failed ? (
      <main
        role="alert"
        className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="text-2xl font-semibold">
          No pudimos mostrar esta pantalla
        </h1>
        <p className="text-sm text-muted-foreground">
          Recarga para volver a intentarlo. Si estabas guardando una operación,
          revisa su estado antes de repetirla.
        </p>
        <ButtonTA onClick={() => window.location.reload()}>Recargar</ButtonTA>
      </main>
    ) : (
      this.props.children
    );
}
