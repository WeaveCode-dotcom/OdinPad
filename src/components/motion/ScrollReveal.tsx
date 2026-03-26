import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 36, filter: "blur(8px)", rotateX: 6 }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)", rotateX: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26, mass: 0.65, delay }}
      style={{ transformPerspective: 900 }}
    >
      {children}
    </motion.div>
  );
}
