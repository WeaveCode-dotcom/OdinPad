import type { ReactNode } from "react";

/** Solid ambient blocks — flat neo-brutalist decoration (no gradients) */
export function AppArtsyDecor({ dense = false }: { dense?: boolean }) {
  const shape = "border-2 border-primary/15 bg-primary/5";
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className={`absolute -right-[8%] -top-[10%] h-[42vmin] w-[42vmin] rounded-full ${shape}`} />
      <div
        className={`absolute -left-[5%] top-[30%] h-[36vmin] w-[36vmin] rounded-full border-2 border-muted-foreground/10 bg-muted/40`}
      />
      <div
        className={`absolute bottom-[5%] right-[15%] h-[28vmin] w-[28vmin] rotate-12 rounded-[40%_60%_70%_30%] border-2 border-accent-foreground/10 bg-accent/30`}
      />
      {dense && <div className={`absolute left-[20%] top-[60%] h-24 w-24 rounded-full ${shape}`} />}
    </div>
  );
}

export function ArtsyPageChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-0 w-full">
      <AppArtsyDecor />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
