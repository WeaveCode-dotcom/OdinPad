import type { EnvIssue } from "@/lib/env";

export default function ConfigErrorScreen({ issues }: { issues: EnvIssue[] }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Configuration required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          OdinPad needs Supabase credentials before it can run. Add them to a{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> file in the project root (see{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code>), then restart the dev server.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {issues.map((i) => (
            <li key={i.key} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <span className="font-mono text-xs text-destructive">{i.key}</span>
              <p className="mt-1 text-muted-foreground">{i.message}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">
          These values are public (anon) keys in the browser bundle — never put service-role or Groq API keys in{" "}
          <code className="rounded bg-muted px-1">VITE_*</code> variables.
        </p>
      </div>
    </div>
  );
}
