import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Globe, Loader2, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator, isPasswordStrong } from '@/components/PasswordStrengthIndicator';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [showResetSentMessage, setShowResetSentMessage] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check for password reset mode from URL
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
    if (mode === 'forgot') {
      const result = emailSchema.safeParse({ email });
      if (!result.success) {
        setErrors({ email: result.error.errors[0]?.message });
        return false;
      }
      setErrors({});
      return true;
    }
    
    if (mode === 'reset' || mode === 'signup') {
      // For signup and reset, use strong password validation
      const emailResult = mode === 'signup' ? emailSchema.safeParse({ email }) : { success: true };
      if (!emailResult.success) {
        setErrors({ email: 'Please enter a valid email address' });
        return false;
      }
      
      if (!isPasswordStrong(password)) {
        setErrors({ password: 'Password does not meet all requirements' });
        return false;
      }
      setErrors({});
      return true;
    }

    // Login mode - just check email format and that password exists
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'You have been logged in successfully.' });
      } else if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          setShowVerificationMessage(true);
        } else {
          toast({ 
            title: 'Account created!', 
            description: 'Welcome to Waymark. Start tracking your travels.',
          });
        }
      } else if (mode === 'forgot') {
        const redirectUrl = `${window.location.origin}/auth?type=recovery`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
        setShowResetSentMessage(true);
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        if (error) throw error;
        toast({ 
          title: 'Password updated!', 
          description: 'Your password has been reset successfully.',
        });
        navigate('/');
      }
    } catch (error: any) {
      let message = error.message;
      if (message.includes('User already registered')) {
        message = 'An account with this email already exists. Please sign in instead.';
      } else if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      toast({ 
        title: mode === 'login' ? 'Login failed' : mode === 'signup' ? 'Signup failed' : mode === 'forgot' ? 'Reset failed' : 'Update failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show reset email sent message
  if (showResetSentMessage) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground text-center">
              Check your email
            </h1>
            <p className="text-muted-foreground text-center max-w-sm">
              We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. 
              Click the link to reset your password.
            </p>
          </div>

          <div className="card-elevated p-6 space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Check your spam folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setShowResetSentMessage(false);
                setMode('login');
                setEmail('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show verification message screen
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground text-center">
              Check your email
            </h1>
            <p className="text-muted-foreground text-center max-w-sm">
              We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. 
              Click the link to verify your account and start your journey.
            </p>
          </div>

          <div className="card-elevated p-6 space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Check your spam folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setShowVerificationMessage(false);
                setEmail('');
                setPassword('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  if (mode === 'reset') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Reset Password
            </h1>
            <p className="text-muted-foreground text-center">
              Enter your new password
            </p>
          </div>

          <div className="card-elevated p-6 space-y-6">
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
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Globe className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Waymark
            </h1>
            <p className="text-muted-foreground text-center">
              Your private travel ledger
            </p>
          </div>

          <div className="card-elevated p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-display font-semibold text-foreground">
                Forgot password?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll send you a reset link
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
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send reset link
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-primary font-medium">Back to sign in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <Globe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Waymark
          </h1>
          <p className="text-muted-foreground text-center">
            Your private travel ledger
          </p>
        </div>

        {/* Auth Form */}
        <div className="card-elevated p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-display font-semibold text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' ? 'Sign in to continue your journey' : 'Start tracking your adventures'}
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
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrors({});
                    }}
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
              {mode === 'signup' && (
                <PasswordStrengthIndicator password={password} />
              )}
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

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

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
                }
                setLoading(false);
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast({ title: 'Apple sign-in failed', description: error.message, variant: 'destructive' });
                }
                setLoading(false);
              }}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-primary font-medium">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
