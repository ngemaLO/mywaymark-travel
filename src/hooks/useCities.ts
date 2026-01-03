import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface City {
  id: string;
  name: string;
  country_iso2: string;
  type: string;
  lat: number | null;
  lng: number | null;
  visitCount: number;
}

export function useCitiesByCountry(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cities', countryIso2, user?.id],
    queryFn: async (): Promise<City[]> => {
      if (!user || !countryIso2) return [];

      // Get all visits for this country that have a place_id
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('place_id')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .not('place_id', 'is', null);

      if (visitsError) throw visitsError;
      if (!visits || visits.length === 0) return [];

      // Count visits per place
      const placeVisitCounts = visits.reduce((acc, visit) => {
        if (visit.place_id) {
          acc[visit.place_id] = (acc[visit.place_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const placeIds = Object.keys(placeVisitCounts);

      // Get place details
      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .in('id', placeIds);

      if (placesError) throw placesError;

      return (places || []).map(place => ({
        id: place.id,
        name: place.name,
        country_iso2: place.country_iso2,
        type: place.type,
        lat: place.lat,
        lng: place.lng,
        visitCount: placeVisitCounts[place.id] || 0,
      }));
    },
    enabled: !!user && !!countryIso2,
  });
}

export function useAddCity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      countryIso2, 
      cityName,
      arrivalDate 
    }: { 
      countryIso2: string; 
      cityName: string;
      arrivalDate?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // First, check if this city already exists
      let { data: existingPlace } = await supabase
        .from('places')
        .select('id')
        .eq('country_iso2', countryIso2)
        .eq('name', cityName)
        .eq('type', 'city')
        .maybeSingle();

      let placeId: string;

      if (existingPlace) {
        placeId = existingPlace.id;
      } else {
        // Create the place
        const { data: newPlace, error: placeError } = await supabase
          .from('places')
          .insert({
            country_iso2: countryIso2,
            name: cityName,
            type: 'city',
          })
          .select('id')
          .single();

        if (placeError) throw placeError;
        placeId = newPlace.id;
      }

      // Create a visit record with this place
      const { error: visitError } = await supabase
        .from('visits')
        .insert({
          user_id: user.id,
          country_iso2: countryIso2,
          place_id: placeId,
          arrival_date: arrivalDate || new Date().toISOString().split('T')[0],
          source: 'manual',
          source_confidence: 'high',
        });

      if (visitError) throw visitError;

      return { placeId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cities', variables.countryIso2] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success(`Added ${variables.cityName}!`);
    },
    onError: (error) => {
      console.error('Failed to add city:', error);
      toast.error('Failed to add city. Please try again.');
    },
  });
}

export function useRemoveCity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      placeId, 
      countryIso2 
    }: { 
      placeId: string; 
      countryIso2: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Remove visits associated with this place for this user
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', placeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cities', variables.countryIso2] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('City removed');
    },
    onError: (error) => {
      console.error('Failed to remove city:', error);
      toast.error('Failed to remove city. Please try again.');
    },
  });
}
