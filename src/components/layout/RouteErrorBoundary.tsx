import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** Studio shell: full troubleshooting copy. Public: lighter message. */
  variant?: "studio" | "public";
};

type State = {
  error: Error | null;
  supportId: string;
};

const appVersion =
  typeof import.meta.env !== "undefined" && import.meta.env.VITE_APP_VERSION
    ? String(import.meta.env.VITE_APP_VERSION)
    : "";

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, supportId: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const supportId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `err-${Date.now()}`;
    this.setState({ supportId });
    console.error("[OdinPad]", supportId, error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null, supportId: "" });
  };

  override render(): ReactNode {
    const { error, supportId } = this.state;
    const { variant = "studio", children } = this.props;

    if (!error) return children;

    const isStudio = variant === "studio";

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-serif text-xl font-semibold text-foreground">
          {isStudio ? "Something went wrong" : "This page failed to load"}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {isStudio
            ? "The writing desk hit an unexpected error. You can try again; your work is still saved locally when possible."
            : "Try reloading or return to the home page."}
        </p>
        {supportId ? (
          <p className="font-mono text-xs text-muted-foreground">
            Support ID: {supportId}
            {appVersion ? ` · v${appVersion}` : ""}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={this.handleReset}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.assign("/")}>
            Go home
          </Button>
        </div>
      </div>
    );
  }
}
