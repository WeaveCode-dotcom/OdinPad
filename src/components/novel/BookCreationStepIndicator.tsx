import type { BookCreationWizardStep } from "@/lib/book-creation";
import { cn } from "@/lib/utils";

const STEPS: { step: BookCreationWizardStep; label: string; hint: string }[] = [
  { step: 1, label: "Project", hint: "Title & structure" },
  { step: 2, label: "Series", hint: "Optional grouping" },
  { step: 3, label: "Details", hint: "Length & craft" },
];

export function BookCreationStepIndicator({ step }: { step: BookCreationWizardStep }) {
  return (
    <nav aria-label="Book creation steps" className="mb-1">
      <ol className="flex flex-wrap items-stretch gap-2">
        {STEPS.map((s) => {
          const active = step === s.step;
          const done = step > s.step;
          return (
            <li
              key={s.step}
              className={cn(
                "flex min-w-0 flex-1 flex-col rounded-lg border-2 px-2.5 py-2 text-left transition-colors sm:px-3",
                active && "border-teal-600 bg-teal-50/90 dark:bg-teal-950/40",
                done && !active && "border-muted-foreground/30 bg-muted/40",
                !active && !done && "border-muted bg-background/80 opacity-80",
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Step {s.step}
              </span>
              <span
                className={cn("text-sm font-bold", active ? "text-teal-900 dark:text-teal-100" : "text-foreground")}
              >
                {s.label}
              </span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">{s.hint}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
