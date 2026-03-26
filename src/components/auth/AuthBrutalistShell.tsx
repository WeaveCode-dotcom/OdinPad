import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { AuthBrutalistPattern } from "@/components/auth/AuthBrutalistPattern";
import { PageShell } from "@/components/motion/PageShell";

function FormDecor() {
  return (
    <>
      <div
        className="pointer-events-none absolute left-0 top-0 z-0 h-20 w-28 opacity-90 md:h-28 md:w-36"
        style={{
          background: "repeating-linear-gradient(-42deg, #fff 0px, #fff 10px, transparent 10px, transparent 20px)",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute left-[8%] top-[28%] z-0 hidden lg:block" aria-hidden>
        <div className="h-20 w-20 rounded-full border-[3px] border-white/90 shadow-[2px_2px_0_0_#000] md:h-24 md:w-24" />
        <div className="-mt-14 ml-5 h-20 w-20 rotate-12 rounded-full border-[3px] border-white/80 shadow-[2px_2px_0_0_#000] md:-mt-16 md:ml-6 md:h-24 md:w-24" />
        <div className="-mt-12 ml-2 h-20 w-20 -rotate-6 rounded-full border-[3px] border-white/70 shadow-[2px_2px_0_0_#000] md:-mt-14 md:ml-3 md:h-24 md:w-24" />
      </div>
      <span
        className="pointer-events-none absolute right-[10%] top-[14%] z-0 text-xl text-amber-300 drop-shadow-[2px_2px_0_#000] md:text-2xl"
        aria-hidden
      >
        ✦
      </span>
      <span
        className="pointer-events-none absolute bottom-[18%] right-[18%] z-0 text-lg text-amber-200 drop-shadow-[2px_2px_0_#000] md:text-xl"
        aria-hidden
      >
        ✦
      </span>
    </>
  );
}

type AuthBrutalistShellProps = {
  children: ReactNode;
  /** No outer scroll; form fits in 100dvh (signup). */
  compact?: boolean;
};

/** Mint form column + geometric left panel (neo-brutalist auth). */
export function AuthBrutalistShell({ children, compact }: AuthBrutalistShellProps) {
  return (
    <PageShell
      className={`page-viewport w-full bg-[#0f172a] ${compact ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh"}`}
    >
      <div
        className={`grid w-full grid-cols-1 md:grid-cols-2 ${compact ? "h-dvh max-h-dvh overflow-hidden md:h-dvh" : "min-h-dvh"}`}
      >
        <div
          className={`relative shrink-0 border-b-4 border-black md:border-b-0 md:border-r-4 ${compact ? "h-24 md:h-auto md:min-h-0" : "h-52 md:min-h-dvh"}`}
        >
          <AuthBrutalistPattern />
        </div>
        <div
          className={`relative flex min-h-0 flex-col border-black bg-[#7fdcc1] px-3 md:px-10 ${compact ? "max-h-[calc(100dvh-6rem)] overflow-hidden py-3 md:max-h-none md:py-8 md:min-h-dvh" : "min-h-dvh justify-center py-10 md:py-12"}`}
        >
          <FormDecor />
          <div
            className={`relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-col ${compact ? "flex-1 justify-start overflow-hidden pt-1" : "flex-1 justify-center"}`}
          >
            {!compact && (
              <div className="mb-6 flex items-center gap-2 md:hidden">
                <span className="text-2xl font-black uppercase tracking-tighter text-black">OdinPad</span>
              </div>
            )}
            {compact && (
              <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
                <span className="text-base font-black uppercase tracking-tighter text-black md:text-lg">OdinPad</span>
                <Link
                  to="/"
                  className="text-[10px] font-bold text-black underline decoration-2 underline-offset-2 md:text-xs"
                >
                  Home
                </Link>
              </div>
            )}
            {children}
          </div>
          {!compact && (
            <Link
              to="/"
              className="relative z-10 mt-8 text-center text-sm font-bold text-black underline decoration-2 underline-offset-4 hover:text-neutral-800"
            >
              ← Back to home
            </Link>
          )}
          {compact && (
            <p className="relative z-10 mt-auto shrink-0 pt-2 text-center text-[10px] font-semibold text-black/70 md:text-xs">
              <Link to="/" className="font-bold text-black underline underline-offset-2">
                ← Back to home
              </Link>
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
