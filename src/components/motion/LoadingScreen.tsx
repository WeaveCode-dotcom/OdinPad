interface LoadingScreenProps {
  /** Optional context label shown beneath the spinner (e.g. "Loading your library…"). */
  message?: string;
}

/**
 * CSS-only loading indicator — no JavaScript animation on the critical rendering path.
 * Respects `prefers-reduced-motion` via the Tailwind `motion-safe:` variant on animations.
 */
export function LoadingScreen({ message }: LoadingScreenProps = {}) {
  return (
    <div
      className="page-viewport relative flex flex-col items-center justify-center overflow-hidden bg-background"
      role="status"
      aria-label={message ?? "Loading"}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer ring */}
        <span className="absolute inset-0 rounded-full border-2 border-muted motion-safe:animate-spin motion-safe:[animation-duration:1.2s]" />
        {/* Inner dashed ring — counter-rotate */}
        <span className="absolute inset-2 rounded-full border-2 border-dashed border-primary/40 motion-safe:animate-spin motion-safe:[animation-direction:reverse] motion-safe:[animation-duration:1.8s]" />
        {/* Centre dot */}
        <span className="relative z-[1] h-3 w-3 rounded-full bg-primary" />
      </div>
      <p className="relative z-[1] mt-6 text-sm font-medium text-muted-foreground" aria-hidden>
        {message ?? "Loading…"}
      </p>
    </div>
  );
}
