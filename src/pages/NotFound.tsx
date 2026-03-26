import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { ArtsyPageChrome } from "@/components/layout/AppArtsyDecor";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-viewport flex w-full items-center justify-center bg-background px-2 py-8">
      <ArtsyPageChrome>
        <div className="relative w-full max-w-lg rotate-[0.5deg] border border-border bg-amber-50 p-8 text-center motion-reduce:rotate-0">
          <span className="absolute -left-2 -top-3 -rotate-6 rounded-md border border-border bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
            Lost
          </span>
          <h1 className="mb-2 text-5xl font-bold leading-none tracking-tight text-foreground md:text-6xl">404</h1>
          <p className="mb-6 font-medium text-muted-foreground">
            That page doesn&apos;t exist — maybe it wandered off into act II.
          </p>
          <a
            href="/"
            className="inline-flex rounded-md border border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow hover:shadow-md"
          >
            Return home
          </a>
        </div>
      </ArtsyPageChrome>
    </div>
  );
};

export default NotFound;
