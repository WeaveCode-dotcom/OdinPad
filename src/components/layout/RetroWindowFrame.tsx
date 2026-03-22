import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  accent?: 'lavender' | 'mint' | 'peach' | 'sky' | 'white';
};

const accentBg: Record<NonNullable<Props['accent']>, string> = {
  lavender: 'bg-neo-lavender',
  mint: 'bg-neo-mint',
  peach: 'bg-neo-peach',
  sky: 'bg-neo-sky',
  white: 'bg-white',
};

export function RetroWindowFrame({ title, children, className = '', accent = 'white' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, rotate: -0.3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className={`flex flex-col overflow-hidden border-2 border-black ${accentBg[accent]} ${className}`}
    >
      <div className="flex items-center gap-2 border-b-2 border-black bg-[hsl(var(--neo-indigo))] px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full border border-white/80 bg-red-400" />
          <span className="h-2 w-2 rounded-full border border-white/80 bg-amber-300" />
          <span className="h-2 w-2 rounded-full border border-white/80 bg-emerald-400" />
        </span>
        <span className="flex-1 truncate text-center">{title}</span>
        <span className="w-10" />
      </div>
      <div className="min-h-0 flex-1 space-y-3 p-3 sm:p-4">{children}</div>
    </motion.div>
  );
}
