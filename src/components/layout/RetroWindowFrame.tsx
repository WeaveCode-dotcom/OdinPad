import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  accent?: "lavender" | "mint" | "peach" | "sky" | "white";
};

export function RetroWindowFrame({ title, children, className = "" }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? false : { opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}
      className={`flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm ${className}`}
    >
      <div className="flex items-center border-b border-border bg-secondary/50 px-4 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-foreground">{title}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 p-4">{children}</div>
    </motion.div>
  );
}
