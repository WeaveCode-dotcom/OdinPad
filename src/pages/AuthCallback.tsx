import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { ArtsyPageChrome } from "@/components/layout/AppArtsyDecor";

type CallbackState = "loading" | "success" | "error";

const ERROR_HINTS: Record<string, string> = {
  access_denied: "Access was denied by the identity provider.",
  server_error: "OAuth provider reported a server error. Try again shortly.",
  temporarily_unavailable: "OAuth provider is temporarily unavailable.",
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Completing sign-in...");

  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");

  const errorText = useMemo(() => {
    if (!providerError) return "";
    return providerErrorDescription || ERROR_HINTS[providerError] || "Could not complete OAuth sign-in.";
  }, [providerError, providerErrorDescription]);

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    const timeoutMs = 7000;

    if (providerError) {
      setState("error");
      setMessage(errorText);
      return;
    }

    const verifySession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setState("error");
        setMessage(error.message);
        return;
      }

      if (data.session?.user) {
        setState("success");
        setMessage("Sign-in successful. Redirecting...");
        window.setTimeout(() => navigate("/"), 400);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        setState("error");
        setMessage("No active session detected after callback. Check OAuth redirect settings and try again.");
        return;
      }

      window.setTimeout(verifySession, 350);
    };

    void verifySession();
    return () => {
      active = false;
    };
  }, [providerError, errorText, navigate]);

  return (
    <div className="page-viewport flex w-full items-center justify-center bg-neo-bg px-2 py-10">
      <ArtsyPageChrome>
      <div className="w-full max-w-md rotate-1 border-2 border-black bg-neo-sky/40 p-5 text-center motion-reduce:rotate-0 sm:px-6">
        {state === "loading" && (
          <div className="mb-3 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {state === "success" && (
          <div className="mb-3 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
        )}
        {state === "error" && (
          <div className="mb-3 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        )}

        <h1 className="mb-2 text-lg font-semibold text-foreground">Authentication Callback</h1>
        <p className="text-sm text-muted-foreground">{message}</p>

        {state === "error" && (
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Return Home
            </Button>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        )}
      </div>
      </ArtsyPageChrome>
    </div>
  );
}
