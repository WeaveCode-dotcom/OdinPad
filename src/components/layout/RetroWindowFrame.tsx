import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  accent?: "lavender" | "mint" | "peach" | "sky" | "white";
};

const accentBg: Record<NonNullable<Props["accent"]>, string> = {
  lavender: "bg-teal-50",
  mint: "bg-emerald-50",
  peach: "bg-amber-50",
  sky: "bg-sky-50",
  white: "bg-white",
};

export function RetroWindowFrame({ title, children, className = "", accent = "white" }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, rotate: -0.3 }}
      animate={reduceMotion ? false : { opacity: 1, y: 0, rotate: 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}
      className={`flex flex-col overflow-hidden border border-border ${accentBg[accent]} ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-zinc-950 bg-zinc-950 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-50">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full border border-zinc-600 bg-red-500" />
          <span className="h-2 w-2 rounded-full border border-zinc-600 bg-amber-400" />
          <span className="h-2 w-2 rounded-full border border-zinc-600 bg-emerald-500" />
        </span>
        <span className="flex-1 truncate text-center">{title}</span>
        <span className="w-10" aria-hidden />
      </div>
      <div className="min-h-0 flex-1 space-y-3 p-3 sm:p-4">{children}</div>
    </motion.div>
  );
}
