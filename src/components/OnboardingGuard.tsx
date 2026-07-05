import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const EXEMPT = ['/onboarding', '/auth', '/share/'];

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { onboardingComplete, isLoading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || (user && profileLoading)) return null;
  if (!user) return <>{children}</>;
  if (EXEMPT.some((p) => location.pathname.startsWith(p))) return <>{children}</>;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
