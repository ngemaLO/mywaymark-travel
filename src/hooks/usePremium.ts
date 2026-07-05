import { useAuth } from '@/contexts/AuthContext';

// Premium status is read from user metadata set by the Stripe webhook.
// Until Stripe is integrated, all users are on the free tier.
export function useIsPremium() {
  const { user } = useAuth();

  const isPremium =
    user?.app_metadata?.is_premium === true ||
    user?.user_metadata?.is_premium === true;

  return {
    isPremium,
    isLoading: false,
    planName: isPremium ? 'Premium' : null,
  };
}
