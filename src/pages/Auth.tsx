import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { MapPin, Loader2, Mail, ArrowLeft, KeyRound, Globe, Compass, BarChart2 } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/PasswordStrengthIndicator';
import { Separator } from '@/components/ui/separator';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function Logo() {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
        <MapPin className="w-7 h-7 text-primary-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-foreground">Waymark</h1>
        <p className="text-sm text-muted-foreground">Your all-in-one travel companion</p>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden md:flex flex-col justify-center p-12 space-y-10">
      <div className="space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <MapPin className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Waymark</h1>
          <p className="text-muted-foreground mt-1">Your all-in-one travel companion</p>
        </div>
      </div>

      <div className="space-y-5">
        {[
          { icon: Globe, title: 'Track your world', desc: 'Pin every country you visit and watch your personal map come to life.' },
          { icon: Compass, title: 'Plan with AI', desc: 'Get day-by-day itineraries tailored to your travel style and history.' },
          { icon: BarChart2, title: 'Discover insights', desc: 'Explore stats, streaks, and reflections from your journey so far.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen md:min-h-0 p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        {children}
      </div>
    </div>
  );
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [showResetSentMessage, setShowResetSentMessage] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setMode('reset');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate('/');
    }
  }, [user, navigate, mode]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (mode === 'forgot') {
      const result = emailSchema.safeParse({ email });
      if (!result.success) newErrors.email = result.error.errors[0]?.message;
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (mode === 'reset') {
      if (!isPasswordStrong(password)) newErrors.password = 'Password does not meet all requirements';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) newErrors.fullName = 'Please enter your name';
      const emailResult = emailSchema.safeParse({ email });
      if (!emailResult.success) newErrors.email = emailResult.error.errors[0]?.message;
      if (!isPasswordStrong(password)) newErrors.password = 'Password does not meet all requirements';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // login
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') newErrors.email = err.message;
        if (err.path[0] === 'password') newErrors.password = err.message;
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!' });
      } else if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setShowVerificationMessage(true);
        } else {
          toast({ title: 'Account created!', description: 'Welcome to Waymark.' });
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?type=recovery`,
        });
        if (error) throw error;
        setShowResetSentMessage(true);
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast({ title: 'Password updated!', description: 'Your password has been reset.' });
        navigate('/');
      }
    } catch (error: any) {
      let message = error.message;
      if (message.includes('User already registered')) {
        message = 'An account with this email already exists. Please sign in instead.';
      } else if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      const titles = { login: 'Sign in failed', signup: 'Sign up failed', forgot: 'Reset failed', reset: 'Update failed' };
      toast({ title: titles[mode], description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setErrors({});
    setFullName('');
    setPassword('');
    setConfirmPassword('');
  };

  // Email sent screens
  if (showResetSentMessage || showVerificationMessage) {
    const isReset = showResetSentMessage;
    return (
      <div className="min-h-screen md:grid md:grid-cols-2">
        <BrandPanel />
        <FormCard>
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {isReset
                  ? <>We sent a reset link to <span className="font-medium text-foreground">{email}</span>.</>
                  : <>We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Click it to activate your account.</>
                }
              </p>
            </div>
          </div>

          <div className="card-elevated p-6 space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-xs uppercase tracking-wider">Didn't get it?</p>
              <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a minute and try again</li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (isReset) {
                  setShowResetSentMessage(false);
                  setMode('login');
                  setEmail('');
                } else {
                  setShowVerificationMessage(false);
                  setPassword('');
                  setConfirmPassword('');
                }
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isReset ? 'Back to sign in' : 'Back to sign up'}
            </Button>
          </div>
        </FormCard>
      </div>
    );
  }

  // Password reset form
  if (mode === 'reset') {
    return (
      <div className="min-h-screen md:grid md:grid-cols-2">
        <BrandPanel />
        <FormCard>
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <KeyRound className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-foreground">Reset password</h1>
              <p className="text-sm text-muted-foreground">Enter your new password below</p>
            </div>
          </div>

          <div className="card-elevated p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={errors.password ? 'border-destructive' : ''}
                />
                <PasswordStrengthIndicator password={password} />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update password
              </Button>
            </form>
          </div>
        </FormCard>
      </div>
    );
  }

  // Forgot password form
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen md:grid md:grid-cols-2">
        <BrandPanel />
        <FormCard>
          <Logo />
          <div className="card-elevated p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-display font-semibold text-foreground">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send reset link
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrors({}); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary font-medium">Back to sign in</span>
              </button>
            </div>
          </div>
        </FormCard>
      </div>
    );
  }

  // Main login / signup form
  return (
    <div className="min-h-screen md:grid md:grid-cols-2">
      <BrandPanel />
      <FormCard>
        <Logo />

        <div className="card-elevated p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-display font-semibold text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' ? 'Sign in to continue your journey' : 'Start tracking your adventures'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  autoFocus
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus={mode === 'login'}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrors({}); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {mode === 'signup' && <PasswordStrengthIndicator password={password} />}
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              type="button"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/` },
                });
                if (error) toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
                setLoading(false);
              }}
            >
              <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'apple',
                  options: { redirectTo: `${window.location.origin}/` },
                });
                if (error) toast({ title: 'Apple sign-in failed', description: error.message, variant: 'destructive' });
                setLoading(false);
              }}
            >
              <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-primary font-medium">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
