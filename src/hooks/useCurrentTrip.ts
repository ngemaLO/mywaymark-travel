import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrentHomeBase } from './useHomeBase';

export interface CurrentTrip {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  place_id: string | null;
  trip_id: string | null;
  is_travel: boolean;
}

export interface TravelState {
  type: 'travelling' | 'at_home' | 'none';
  currentTrip: CurrentTrip | null;
  homeBaseCountry: string | null;
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
        .select(`
          *,
          trips:trip_id (
            id,
            is_travel
          )
        `)
        .eq('user_id', user.id)
        .is('departure_date', null)
        .order('arrival_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      // Extract is_travel from the joined trip, default to true if no trip record
      const tripData = data.trips as { id: string; is_travel: boolean } | null;
      
      return {
        id: data.id,
        country_iso2: data.country_iso2,
        arrival_date: data.arrival_date,
        departure_date: data.departure_date,
        place_id: data.place_id,
        trip_id: data.trip_id,
        is_travel: tripData?.is_travel ?? true, // Default to travel if no trip record
      } as CurrentTrip;
    },
    enabled: !!user,
  });
}

// New hook that returns the full travel state (travelling, at home, or none)
export function useTravelState(): { data: TravelState | null; isLoading: boolean } {
  const { data: currentTrip, isLoading: tripLoading } = useCurrentTrip();
  const { homeBase, isLoading: homeBaseLoading } = useCurrentHomeBase();

  const isLoading = tripLoading || homeBaseLoading;

  if (isLoading) {
    return { data: null, isLoading: true };
  }

  // No ongoing visit at all
  if (!currentTrip) {
    return {
      data: {
        type: 'none',
        currentTrip: null,
        homeBaseCountry: homeBase?.country_iso2 || null,
      },
      isLoading: false,
    };
  }

  // Has an ongoing visit marked as travel
  if (currentTrip.is_travel) {
    return {
      data: {
        type: 'travelling',
        currentTrip,
        homeBaseCountry: homeBase?.country_iso2 || null,
      },
      isLoading: false,
    };
  }

  // Has an ongoing visit but NOT marked as travel (at home)
  return {
    data: {
      type: 'at_home',
      currentTrip,
      homeBaseCountry: currentTrip.country_iso2,
    },
    isLoading: false,
  };
}

export function useEndCurrentTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitId: string) => {
      if (!user) throw new Error('Must be logged in');

      const today = new Date().toISOString().split('T')[0];

      // First get the visit to find the trip_id
      const { data: visit } = await supabase
        .from('visits')
        .select('trip_id')
        .eq('id', visitId)
        .single();

      // End the visit
      const { error } = await supabase
        .from('visits')
        .update({ departure_date: today })
        .eq('id', visitId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Also end the associated trip if it exists
      if (visit?.trip_id) {
        await supabase
          .from('trips')
          .update({ end_date: today })
          .eq('id', visit.trip_id)
          .eq('user_id', user.id);
      }
    },
    onSuccess: () => {
      toast.success('Trip ended successfully');
      queryClient.invalidateQueries({ queryKey: ['current-trip'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['recent-visits'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
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
