import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthBrutField } from "@/components/auth/AuthBrutField";
import { AuthCard, AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { COOLDOWN_SECONDS, isThrottleError, normalizeEmail } from "@/lib/auth-validation";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const applyError = (message: string) => {
    setError(message);
    if (isThrottleError(message)) setCooldown(COOLDOWN_SECONDS);
  };

  const handleSubmit = async () => {
    setError("");
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    const result = await signIn(normalizedEmail, password);
    setLoading(false);
    if (result.error) {
      applyError(result.error);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleGoogle = async () => {
    setError("");
    if (cooldown > 0) return;
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.error) applyError(result.error);
  };

  return (
    <AuthPageLayout>
      <AuthCard title="Welcome back, friend!">
        <GoogleOAuthButton className="w-full" disabled={loading || cooldown > 0} onClick={handleGoogle} />

        <div className="flex items-center gap-3 py-1">
          <Separator className="flex-1 bg-black" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black">or</span>
          <Separator className="flex-1 bg-black" />
        </div>

        <AuthBrutField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmail((v) => normalizeEmail(v))}
          autoComplete="email"
          invalid={Boolean(error)}
          describedBy={error ? "login-form-error" : undefined}
        />

        <AuthBrutField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
          autoComplete="current-password"
          invalid={Boolean(error)}
          describedBy={error ? "login-form-error" : undefined}
        />

        {error && (
          <p id="login-form-error" role="alert" className="text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
        {cooldown > 0 && (
          <p className="text-xs font-medium text-black/70">
            Too many attempts. Please wait {cooldown}s before trying again.
          </p>
        )}

        <Button
          onClick={() => void handleSubmit()}
          className="h-12 w-full rounded-none border-2 border-black bg-[#fde047] text-base font-black uppercase tracking-[0.12em] text-black shadow-[6px_6px_0_0_#000] hover:bg-[#facc15]"
          disabled={loading || cooldown > 0}
        >
          {loading ? "Please wait…" : "Sign in"}
        </Button>

        <p className="text-center text-sm font-semibold text-black">
          <Link to="/forgot-password" className="font-black text-black underline decoration-2 underline-offset-4">
            Forgot password?
          </Link>
        </p>

        <p className="text-right text-sm font-semibold text-black">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-black text-black underline decoration-2 underline-offset-4">
            Sign up
          </Link>
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
}
