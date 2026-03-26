import { RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  panelName: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[Canvas/${this.props.panelName}]`, error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-sm border-2 border-border bg-muted/20 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          The <span className="font-semibold">{this.props.panelName}</span> panel failed to load.
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Your work is saved. Reload this panel to try again — other panels are unaffected.
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="inline-flex items-center gap-1.5 rounded-sm border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-none transition-colors hover:bg-accent/10"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Reload panel
        </button>
      </div>
    );
  }
}
