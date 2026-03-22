import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AuthCard, AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton';
import { PageShell } from '@/components/motion/PageShell';
import { AuthMarketingPanel } from '@/components/layout/AuthMarketingPanel';
import { AuthFormColumn } from '@/components/layout/AuthFormColumn';
import {
  COOLDOWN_SECONDS,
  isThrottleError,
  normalizeEmail,
  validatePassword,
} from '@/lib/auth-validation';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { user, signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const passwordError = useMemo(() => validatePassword(password), [password]);

  const applyError = (message: string) => {
    setError(message);
    if (isThrottleError(message)) setCooldown(COOLDOWN_SECONDS);
  };

  const handleSubmit = async () => {
    setError('');
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    const result = await signUp(normalizedEmail, password, name);
    setLoading(false);
    if (result.error) {
      applyError(result.error);
    } else {
      setConfirmSent(true);
    }
  };

  const handleGoogle = async () => {
    setError('');
    if (cooldown > 0) return;
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.error) applyError(result.error);
  };

  if (confirmSent) {
    return (
      <PageShell className="page-viewport grid min-h-dvh w-full grid-cols-1 md:grid-cols-2">
        <AuthMarketingPanel />
        <AuthFormColumn>
          <div className="w-full max-w-md border-2 border-black bg-neo-mint/50 p-5 md:-rotate-1 motion-reduce:rotate-0">
            <h1 className="text-xl font-black uppercase tracking-tight text-[hsl(var(--neo-indigo))]">Check your email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We&apos;ve sent a confirmation link to <strong className="text-foreground">{email}</strong>. Activate your account, then{' '}
              <Link to="/login" className="font-semibold text-[hsl(var(--neo-indigo))] underline">
                sign in
              </Link>
              .
            </p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link to="/login">Back to Sign In</Link>
            </Button>
          </div>
        </AuthFormColumn>
      </PageShell>
    );
  }

  return (
    <AuthPageLayout>
      <AuthCard title="Create your account">
        <GoogleOAuthButton disabled={loading || cooldown > 0} onClick={handleGoogle} />
        <div className="flex items-center gap-3">
          <Separator className="flex-1 bg-black" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">or</span>
          <Separator className="flex-1 bg-black" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--neo-indigo))]">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--neo-indigo))]">Email</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            onBlur={() => setEmail(v => normalizeEmail(v))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--neo-indigo))]">Password</label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
          />
          {password && passwordError && <p className="mt-1 text-xs text-destructive">{passwordError}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {cooldown > 0 && (
          <p className="text-xs text-muted-foreground">Too many attempts. Please wait {cooldown}s before trying again.</p>
        )}

        <Button onClick={() => void handleSubmit()} className="w-full" disabled={loading || cooldown > 0}>
          {loading ? 'Please wait...' : 'Create Account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[hsl(var(--neo-indigo))] underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
}
