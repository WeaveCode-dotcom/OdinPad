import { useEffect, useMemo, useRef, useState } from "react";

import { buildSubtitleLine, deriveIdeaWebAnalytics, SUBTITLE_ROTATE_MS } from "@/lib/idea-web/subtitle-insights";
import { cn } from "@/lib/utils";
import type { IdeaWebEntry, IdeaWebLink } from "@/types/idea-web";

const TYPEWRITER_MAX_MS = 2800;

type Props = {
  entries: IdeaWebEntry[];
  links: IdeaWebLink[];
  novels: { id: string; title?: string }[];
  filteredCount: number;
  className?: string;
};

export function IdeaWebSmartSubtitle({ entries, links, novels, filteredCount, className }: Props) {
  const analytics = useMemo(() => deriveIdeaWebAnalytics(entries, links, novels), [entries, links, novels]);
  const [rotateIndex, setRotateIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => {
      setRotateIndex((i) => i + 1);
    }, SUBTITLE_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const targetLine = useMemo(
    () => buildSubtitleLine(analytics, filteredCount, rotateIndex),
    [analytics, filteredCount, rotateIndex],
  );

  const targetRef = useRef(targetLine);
  targetRef.current = targetLine;

  useEffect(() => {
    const full = targetLine;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplayed(full);
      return;
    }

    setDisplayed("");
    let cancelled = false;
    const start = performance.now();

    const frame = (now: number) => {
      if (cancelled || targetRef.current !== full) return;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / TYPEWRITER_MAX_MS);
      const count = Math.min(full.length, Math.floor(progress * full.length));
      setDisplayed(full.slice(0, count));
      if (count < full.length && !cancelled) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
    return () => {
      cancelled = true;
    };
  }, [targetLine]);

  return (
    <p className={cn("min-h-[2.5rem] text-xs text-muted-foreground", className)} title={targetLine}>
      {displayed}
    </p>
  );
}
