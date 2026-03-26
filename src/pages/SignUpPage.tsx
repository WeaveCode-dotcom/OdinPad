import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthBrutalistShell } from "@/components/auth/AuthBrutalistShell";
import { AuthBrutField } from "@/components/auth/AuthBrutField";
import { AuthCard, AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { COOLDOWN_SECONDS, isThrottleError, normalizeEmail, validatePassword } from "@/lib/auth-validation";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { user, signUp, signInWithGoogle } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const passwordError = useMemo(() => validatePassword(password), [password]);

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
    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (cooldown > 0) return;

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    setLoading(true);
    const result = await signUp(normalizedEmail, password, fullName);
    setLoading(false);
    if (result.error) {
      applyError(result.error);
    } else {
      setConfirmSent(true);
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

  if (confirmSent) {
    return (
      <AuthBrutalistShell compact>
        <div className="w-full space-y-3 border-2 border-black bg-teal-50 p-4 shadow-[6px_6px_0_0_#000] md:p-6">
          <h1 className="text-xl font-black uppercase tracking-tight text-black">Check your email</h1>
          <p className="text-sm font-medium text-black/80">
            We&apos;ve sent a confirmation link to <strong className="text-black">{email}</strong>. Activate your
            account, then{" "}
            <Link to="/login" className="font-black text-black underline decoration-2">
              sign in
            </Link>
            .
          </p>
          <Button
            className="h-12 w-full rounded-none border-2 border-black bg-[#fde047] text-sm font-black uppercase tracking-wide text-black shadow-[6px_6px_0_0_#000] hover:bg-[#facc15]"
            variant="outline"
            asChild
          >
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthBrutalistShell>
    );
  }

  return (
    <AuthPageLayout compact>
      <AuthCard title="Welcome Aboard, Friend!" compact>
        <GoogleOAuthButton
          disabled={loading || cooldown > 0}
          onClick={handleGoogle}
          className="h-10 w-full text-xs shadow-[4px_4px_0_0_#000]"
        />

        <div className="flex items-center gap-2 py-0.5">
          <Separator className="flex-1 bg-black" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black">or</span>
          <Separator className="flex-1 bg-black" />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AuthBrutField
            compact
            id="firstName"
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            invalid={Boolean(error)}
            describedBy={error ? "signup-form-error" : undefined}
          />
          <AuthBrutField
            compact
            id="lastName"
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            invalid={Boolean(error)}
            describedBy={error ? "signup-form-error" : undefined}
          />
        </div>

        <AuthBrutField
          compact
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmail((v) => normalizeEmail(v))}
          autoComplete="email"
          invalid={Boolean(error)}
          describedBy={error ? "signup-form-error" : undefined}
        />

        <AuthBrutField
          compact
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          invalid={Boolean(error || passwordError)}
          describedBy={
            [password && passwordError ? "signup-password-rules" : "", error ? "signup-form-error" : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />

        <AuthBrutField
          compact
          id="confirmPassword"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
          autoComplete="new-password"
          invalid={Boolean(error)}
          describedBy={error ? "signup-form-error" : undefined}
        />

        {password && passwordError && (
          <p id="signup-password-rules" role="status" className="text-[10px] font-semibold leading-tight text-red-800">
            {passwordError}
          </p>
        )}
        {error && (
          <p id="signup-form-error" role="alert" className="text-xs font-semibold leading-tight text-red-800">
            {error}
          </p>
        )}
        {cooldown > 0 && (
          <p className="text-[10px] font-medium leading-tight text-black/70">Wait {cooldown}s before retry.</p>
        )}

        <Button
          onClick={() => void handleSubmit()}
          className="h-10 w-full rounded-none border-2 border-black bg-[#fde047] text-sm font-black uppercase tracking-[0.1em] text-black shadow-[5px_5px_0_0_#000] hover:bg-[#facc15]"
          disabled={loading || cooldown > 0}
        >
          {loading ? "Please wait…" : "Sign up"}
        </Button>

        <p className="text-right text-[11px] font-semibold leading-tight text-black sm:text-xs">
          Already have an account?{" "}
          <Link to="/login" className="font-black text-black underline decoration-2 underline-offset-2">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
}
