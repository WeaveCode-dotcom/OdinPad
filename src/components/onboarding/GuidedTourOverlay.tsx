import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

interface GuidedTourOverlayProps {
  selector: string;
  title: string;
  description: string;
  stepIndex: number;
  stepCount: number;
  onNext: () => void;
  onSkip: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function GuidedTourOverlay({
  selector,
  title,
  description,
  stepIndex,
  stepCount,
  onNext,
  onSkip,
}: GuidedTourOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const target = document.querySelector(selector);
      if (!target) {
        setRect(null);
        return;
      }
      const targetRect = target.getBoundingClientRect();
      setRect({
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
      });
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [selector]);

  const cardPosition = useMemo(() => {
    if (!rect) return { top: 100, left: 24 };
    const top = Math.min(window.innerHeight - 220, rect.top + rect.height + 12);
    const left = Math.min(window.innerWidth - 360, Math.max(24, rect.left));
    return { top, left };
  }, [rect]);

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/55" />
      {rect && (
        <div
          className="absolute rounded-sm border-2 border-primary shadow-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <div
        className="absolute w-[340px] rounded-sm border-2 border-border bg-card p-4 shadow-none"
        style={cardPosition}
      >
        <p className="text-xs text-muted-foreground">Guided tour {stepIndex + 1}/{stepCount}</p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={onSkip}>Skip tour</Button>
          <Button size="sm" onClick={onNext}>Next</Button>
        </div>
      </div>
    </div>
  );
}
