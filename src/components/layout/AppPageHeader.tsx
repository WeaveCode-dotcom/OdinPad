import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAppShell } from "@/contexts/AppShellContext";

type AppPageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Link to Help (e.g. `/help#idea-web`) for this screen */
  helpLink?: { label: string; to: string };
  actions?: ReactNode;
};

export function AppPageHeader({ title, subtitle, helpLink, actions }: AppPageHeaderProps) {
  const { setMobileNavOpen } = useAppShell();

  return (
    <header className="flex shrink-0 flex-col gap-4 border-b border-border bg-background px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 shrink-0 md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          {helpLink ? (
            <p className="mt-1 text-xs">
              <Link
                to={helpLink.to}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {helpLink.label}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </header>
  );
}
