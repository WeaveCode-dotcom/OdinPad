import type { ReactNode } from 'react';

/** Floating blobs + sparkles — sits behind content, pointer-events none */
export function AppArtsyDecor({ dense = false }: { dense?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -right-[8%] -top-[10%] h-[42vmin] w-[42vmin] rounded-full bg-[hsl(68_100%_50%/0.14)] blur-3xl motion-safe:animate-pulse" />
      <div
        className="absolute -left-[5%] top-[30%] h-[36vmin] w-[36vmin] rounded-full bg-[hsl(258_55%_45%/0.12)] blur-3xl motion-safe:animate-pulse"
        style={{ animationDelay: '0.8s' }}
      />
      <div className="absolute bottom-[5%] right-[15%] h-[28vmin] w-[28vmin] rounded-[40%_60%_70%_30%] bg-[hsl(330_70%_75%/0.18)] blur-2xl" />
      {dense && (
        <div className="absolute left-[20%] top-[60%] h-24 w-24 rounded-full bg-[hsl(200_90%_70%/0.12)] blur-xl" />
      )}
      <svg className="absolute right-[8%] top-[22%] h-10 w-10 text-[hsl(var(--neo-indigo))]/25 motion-safe:animate-neo-float" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
      </svg>
      <svg className="absolute left-[12%] bottom-[25%] h-6 w-6 text-[hsl(var(--neo-lime))]/30 motion-safe:animate-neo-float" style={{ animationDelay: '0.5s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h16M12 4v16" />
      </svg>
    </div>
  );
}

export function ArtsyPageChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-0 w-full">
      <AppArtsyDecor />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
