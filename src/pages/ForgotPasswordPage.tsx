import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthCard, AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { COOLDOWN_SECONDS, isThrottleError, normalizeEmail } from '@/lib/auth-validation';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { user, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const applyError = (message: string) => {
    setError(message);
    if (isThrottleError(message)) setCooldown(COOLDOWN_SECONDS);
  };

  const handleSubmit = async () => {
    setError('');
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError('Please enter your email.');
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
      <AuthCard title="Reset your password">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--neo-indigo))]">Email</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            onBlur={() => setEmail(v => normalizeEmail(v))}
            onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
          />
        </div>

        {resetSent && <p className="text-sm text-emerald-600">If that email exists, a reset link has been sent.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {cooldown > 0 && (
          <p className="text-xs text-muted-foreground">Too many attempts. Please wait {cooldown}s before trying again.</p>
        )}

        <Button onClick={() => void handleSubmit()} className="w-full" disabled={loading || cooldown > 0}>
          {loading ? 'Please wait...' : 'Send Reset Link'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-[hsl(var(--neo-indigo))] underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-[hsl(var(--neo-indigo))] underline">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
}
