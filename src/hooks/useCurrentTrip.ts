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
  is_travel: boolean | null; // null means not explicitly set
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

      // Extract is_travel from the joined trip, null if no trip record
      const tripData = data.trips as { id: string; is_travel: boolean } | null;
      
      return {
        id: data.id,
        country_iso2: data.country_iso2,
        arrival_date: data.arrival_date,
        departure_date: data.departure_date,
        place_id: data.place_id,
        trip_id: data.trip_id,
        is_travel: tripData?.is_travel ?? null, // null means not explicitly set
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

  // Determine if this is travel or at home
  // Priority: explicit is_travel setting > home base comparison
  let isTravel: boolean;
  
  if (currentTrip.is_travel !== null) {
    // Explicitly set - use the value
    isTravel = currentTrip.is_travel;
  } else {
    // Not explicitly set - infer from home base
    // If current trip is in home base country, default to "at home"
    // Otherwise, default to "travelling"
    isTravel = homeBase?.country_iso2 !== currentTrip.country_iso2;
  }

  if (isTravel) {
    return {
      data: {
        type: 'travelling',
        currentTrip: { ...currentTrip, is_travel: true },
        homeBaseCountry: homeBase?.country_iso2 || null,
      },
      isLoading: false,
    };
  }

  // At home
  return {
    data: {
      type: 'at_home',
      currentTrip: { ...currentTrip, is_travel: false },
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

// Toggle whether current visit is "travel" or "at home"
export function useSetTravelStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, tripId, isTravel }: { visitId: string; tripId: string | null; isTravel: boolean }) => {
      if (!user) throw new Error('Must be logged in');

      if (tripId) {
        // Update existing trip record
        const { error } = await supabase
          .from('trips')
          .update({ is_travel: isTravel })
          .eq('id', tripId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Need to create a trip record and link it to the visit
        const { data: visit } = await supabase
          .from('visits')
          .select('arrival_date')
          .eq('id', visitId)
          .single();

        if (!visit) throw new Error('Visit not found');

        // Create trip record
        const { data: newTrip, error: tripError } = await supabase
          .from('trips')
          .insert({
            user_id: user.id,
            start_date: visit.arrival_date,
            end_date: null,
            source: 'manual',
            is_travel: isTravel,
          })
          .select('id')
          .single();

        if (tripError) throw tripError;

        // Link visit to trip
        const { error: visitError } = await supabase
          .from('visits')
          .update({ trip_id: newTrip.id })
          .eq('id', visitId)
          .eq('user_id', user.id);

        if (visitError) throw visitError;
      }
    },
    onSuccess: (_, { isTravel }) => {
      toast.success(isTravel ? 'Marked as travel trip' : 'Marked as at home');
      queryClient.invalidateQueries({ queryKey: ['current-trip'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update travel status');
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
