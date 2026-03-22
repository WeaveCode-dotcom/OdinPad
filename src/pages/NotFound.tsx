import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArtsyPageChrome } from "@/components/layout/AppArtsyDecor";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-viewport flex w-full items-center justify-center bg-neo-bg px-2 py-8">
      <ArtsyPageChrome>
        <div className="relative w-full max-w-lg rotate-[0.5deg] border-2 border-black bg-neo-peach p-8 text-center motion-reduce:rotate-0">
          <span className="absolute -left-2 -top-3 -rotate-6 border-2 border-black bg-neo-lime px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
            Lost
          </span>
          <h1 className="mb-2 text-5xl font-black uppercase leading-none tracking-tight text-neo-indigo md:text-6xl">404</h1>
          <p className="mb-6 font-medium text-neo-indigo/80">That page doesn&apos;t exist — maybe it wandered off into act II.</p>
          <a
            href="/"
            className="inline-flex border-2 border-black bg-neo-lime px-5 py-2.5 text-sm font-black uppercase tracking-wide text-black shadow-none transition-transform motion-safe:hover:-translate-y-0.5"
          >
            Return home
          </a>
        </div>
      </ArtsyPageChrome>
    </div>
  );
};

export default NotFound;
