import { useAuth } from '@/contexts/AuthContext';

// Placeholder premium status hook - always returns false for now
// Will be connected to Stripe subscriptions later
export function useIsPremium() {
  const { user } = useAuth();

  return {
    isPremium: true, // Temporarily true for testing ElevenLabs
    isLoading: false,
    // For future use
    planName: null as string | null,
  };
}
