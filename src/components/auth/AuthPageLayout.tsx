import type { ReactNode } from "react";

import { AuthBrutalistShell } from "@/components/auth/AuthBrutalistShell";

type AuthPageLayoutProps = {
  children: ReactNode;
  /** Fit form in one viewport without scrolling (signup). */
  compact?: boolean;
};

/** Split-screen auth: geometric panel + mint form column */
export function AuthPageLayout({ children, compact }: AuthPageLayoutProps) {
  return <AuthBrutalistShell compact={compact}>{children}</AuthBrutalistShell>;
}

export function AuthCard({
  children,
  title,
  subtitle,
  compact,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "w-full space-y-3" : "w-full space-y-6"}>
      <div>
        <h1
          className={
            compact
              ? "text-balance text-xl font-black leading-tight tracking-tight text-black md:text-2xl"
              : "text-balance text-2xl font-black leading-[1.1] tracking-tight text-black md:text-3xl"
          }
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={
              compact ? "mt-1 text-xs font-semibold text-black/80" : "mt-2 text-sm font-semibold text-black/80"
            }
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className={compact ? "space-y-2" : "space-y-4"}>{children}</div>
    </div>
  );
}
