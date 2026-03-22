import type { ReactNode } from 'react';
import { PageShell } from '@/components/motion/PageShell';
import { AuthMarketingPanel } from '@/components/layout/AuthMarketingPanel';
import { AuthFormColumn } from '@/components/layout/AuthFormColumn';

type AuthPageLayoutProps = {
  children: ReactNode;
};

/** Split-screen auth: indigo story panel + form (desktop); stacked on mobile */
export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <PageShell className="page-viewport grid min-h-dvh w-full grid-cols-1 md:grid-cols-2">
      <AuthMarketingPanel />
      <AuthFormColumn>{children}</AuthFormColumn>
    </PageShell>
  );
}

export function AuthCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="w-full max-w-md border-2 border-black bg-white p-4 shadow-none sm:p-6 md:-rotate-1 md:max-w-none motion-reduce:rotate-0 lg:max-w-lg">
      <h1 className="text-lg font-black uppercase tracking-wide text-[hsl(var(--neo-indigo))]">{title}</h1>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
