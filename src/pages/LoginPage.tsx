import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AuthCard, AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton';
import { COOLDOWN_SECONDS, isThrottleError, normalizeEmail } from '@/lib/auth-validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (!normalizedEmail || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    const result = await signIn(normalizedEmail, password);
    setLoading(false);
    if (result.error) {
      applyError(result.error);
    } else {
      navigate('/', { replace: true });
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

  return (
    <AuthPageLayout>
      <AuthCard title="Welcome back">
        <GoogleOAuthButton disabled={loading || cooldown > 0} onClick={handleGoogle} />
        <div className="flex items-center gap-3">
          <Separator className="flex-1 bg-black" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">or</span>
          <Separator className="flex-1 bg-black" />
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
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {cooldown > 0 && (
          <p className="text-xs text-muted-foreground">Too many attempts. Please wait {cooldown}s before trying again.</p>
        )}

        <Button onClick={() => void handleSubmit()} className="w-full" disabled={loading || cooldown > 0}>
          {loading ? 'Please wait...' : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/forgot-password" className="font-semibold text-[hsl(var(--neo-indigo))] underline">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-[hsl(var(--neo-indigo))] underline">
            Sign up
          </Link>
        </p>
      </AuthCard>
    </AuthPageLayout>
  );
}
