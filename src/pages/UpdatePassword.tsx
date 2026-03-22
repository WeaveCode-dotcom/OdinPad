import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArtsyPageChrome } from "@/components/layout/AppArtsyDecor";

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validationError = useMemo(() => validatePassword(password), [password]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!password || !confirmPassword) {
      setError("Please complete both fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess("Password updated successfully.");
    window.setTimeout(() => navigate("/"), 700);
  };

  return (
    <div className="page-viewport flex w-full items-center justify-center bg-neo-bg px-2 py-8">
      <ArtsyPageChrome>
      <div className="w-full max-w-md -rotate-1 border-2 border-black bg-white p-5 shadow-none motion-reduce:rotate-0 sm:px-6">
        <h1 className="mb-1 text-xl font-black uppercase tracking-tight text-neo-indigo">Set a new password</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter a strong password to finish account recovery.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">New password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && void handleSubmit()}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}

        <Button className="mt-5 w-full" onClick={() => void handleSubmit()} disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </div>
      </ArtsyPageChrome>
    </div>
  );
}
