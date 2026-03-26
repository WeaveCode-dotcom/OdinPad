import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthBrutField } from "@/components/auth/AuthBrutField";
import { AuthCard, AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { COOLDOWN_SECONDS, isThrottleError, normalizeEmail } from "@/lib/auth-validation";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { user, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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
    if (!normalizedEmail) {
      setError("Please enter your email.");
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    const result = await requestPasswordReset(normalizedEmail);
    setLoading(false);
    if (result.error) {
      applyError(result.error);
    } else {
      setResetSent(true);
    }
  };

  return (
    <AuthPageLayout>
      <AuthCard title="Reset your password" subtitle="We’ll email you a link if the address exists.">
        <AuthBrutField
          id="forgot-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmail((v) => normalizeEmail(v))}
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
          autoComplete="email"
        />

        {resetSent && (
          <p className="text-sm font-semibold text-emerald-900">If that email exists, a reset link has been sent.</p>
        )}
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
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
          {loading ? "Please wait…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm font-semibold text-black">
          Remembered your password?{" "}
          <Link to="/login" className="font-black text-black underline decoration-2 underline-offset-4">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm font-semibold text-black">
          New here?{" "}
          <Link to="/signup" className="font-black text-black underline decoration-2 underline-offset-4">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
}
