import { Feather } from "lucide-react";

import { AppArtsyDecor } from "@/components/layout/AppArtsyDecor";

export function AuthMarketingPanel() {
  return (
    <div className="relative hidden min-h-0 flex-col justify-between overflow-hidden bg-slate-900 px-8 py-10 text-white md:flex">
      <AppArtsyDecor />
      <div className="relative z-10">
        <Feather className="mb-6 h-14 w-14 text-primary" />
        <h2 className="text-3xl font-black uppercase leading-[0.95] tracking-tight lg:text-4xl">
          Write loud.
          <br />
          <span className="text-primary">Plan bold.</span>
        </h2>
        <p className="mt-5 max-w-sm text-sm font-medium leading-relaxed text-white/80">
          One workspace for ideas, outlines, drafts, and review — boxed, labeled, impossible to ignore.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <span className="inline-block rotate-[-2deg] border-2 border-white/40 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
            Neo studio
          </span>
          <span className="inline-block rotate-[1deg] rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground">
            Fiction OS
          </span>
        </div>
      </div>
      <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.35em] text-white/40">
        OdinPad · {new Date().getFullYear()}
      </p>
    </div>
  );
}
