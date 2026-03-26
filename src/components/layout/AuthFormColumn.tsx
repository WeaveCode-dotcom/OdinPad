import { Feather } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthFormColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center px-2 py-6 bg-background md:py-10">
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <Feather className="h-8 w-8 text-foreground" />
        <span className="text-2xl font-black uppercase tracking-tighter text-foreground">OdinPad</span>
      </div>
      {children}
      <Link to="/" className="mt-6 text-sm font-semibold text-foreground underline">
        ← Back to home
      </Link>
    </div>
  );
}
