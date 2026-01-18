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

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
    
    if (mode === 'reset') {
      const result = passwordSchema.safeParse({ password });
      if (!result.success) {
        setErrors({ password: result.error.errors[0]?.message });
        return false;
      }
      setErrors({});
      return true;
    }

    const result = authSchema.safeParse({ email, password });
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
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

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
