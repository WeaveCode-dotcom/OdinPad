import { motion } from 'framer-motion';

export function LoadingScreen() {
  return (
    <div className="page-viewport relative flex flex-col items-center justify-center overflow-hidden neo-grid-light">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(68_100%_50%/0.12),transparent_50%),radial-gradient(circle_at_70%_80%,hsl(258_55%_45%/0.14),transparent_45%)]"
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative flex h-28 w-28 items-center justify-center"
        initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[#2D1B5E]"
          animate={{ rotate: 360, scale: [1, 1.06, 1] }}
          transition={{ rotate: { duration: 2.4, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
        />
        <motion.span
          className="absolute inset-3 rounded-full border-2 border-dashed border-[#D7FF00]"
          animate={{ rotate: -360 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.span
          className="relative z-[1] h-10 w-10 border-2 border-black bg-neo-lime"
          animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      <motion.p
        className="relative z-[1] mt-6 font-black uppercase tracking-[0.35em] text-neo-indigo"
        initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 28 }}
      >
        Loading
        <motion.span
          className="inline-block w-6 text-left"
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          …
        </motion.span>
      </motion.p>
    </div>
  );
}
