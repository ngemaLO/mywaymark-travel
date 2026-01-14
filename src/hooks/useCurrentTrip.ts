import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CurrentTrip {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  place_id: string | null;
  trip_id: string | null;
}

export function useCurrentTrip() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-trip', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // A trip is "current" if it has no end date (ongoing)
      // Order by arrival_date desc to get the most recent ongoing trip
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .is('departure_date', null)
        .order('arrival_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CurrentTrip | null;
    },
    enabled: !!user,
  });
}

export function useEndCurrentTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitId: string) => {
      if (!user) throw new Error('Must be logged in');

      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('visits')
        .update({ departure_date: today })
        .eq('id', visitId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trip ended successfully');
      queryClient.invalidateQueries({ queryKey: ['current-trip'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['recent-visits'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to end trip');
    },
  });
}

export function useMarkTripAsOngoing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitId: string) => {
      if (!user) throw new Error('Must be logged in');

      // First, end any existing ongoing trips
      await supabase
        .from('visits')
        .update({ departure_date: new Date().toISOString().split('T')[0] })
        .eq('user_id', user.id)
        .is('departure_date', null);

      // Then mark the selected trip as ongoing
      const { error } = await supabase
        .from('visits')
        .update({ departure_date: null })
        .eq('id', visitId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trip marked as current');
      queryClient.invalidateQueries({ queryKey: ['current-trip'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['recent-visits'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update trip');
    },
  });
}
