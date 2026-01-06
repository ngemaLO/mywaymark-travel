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
}

export function useCitiesByCountry(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cities', countryIso2, user?.id],
    queryFn: async (): Promise<City[]> => {
      if (!user || !countryIso2) return [];

      // Get user's places for this country from user_places table
      const { data: userPlaces, error: userPlacesError } = await supabase
        .from('user_places')
        .select('place_id')
        .eq('user_id', user.id);

      if (userPlacesError) throw userPlacesError;
      if (!userPlaces || userPlaces.length === 0) return [];

      const placeIds = userPlaces.map(up => up.place_id);

      // Get place details for this country
      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .in('id', placeIds)
        .eq('country_iso2', countryIso2);

      if (placesError) throw placesError;

      return (places || []).map(place => ({
        id: place.id,
        name: place.name,
        country_iso2: place.country_iso2,
        type: place.type,
        lat: place.lat,
        lng: place.lng,
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
    }: { 
      countryIso2: string; 
      cityName: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // First, check if this city already exists as a place
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

      // Check if user already has this place
      const { data: existingUserPlace } = await supabase
        .from('user_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('place_id', placeId)
        .maybeSingle();

      if (existingUserPlace) {
        throw new Error('You have already added this city');
      }

      // Link user to this place
      const { error: linkError } = await supabase
        .from('user_places')
        .insert({
          user_id: user.id,
          place_id: placeId,
        });

      if (linkError) throw linkError;

      return { placeId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cities', variables.countryIso2] });
      toast.success(`Added ${variables.cityName}!`);
    },
    onError: (error: Error) => {
      console.error('Failed to add city:', error);
      if (error.message.includes('already added')) {
        toast.error('You have already added this city');
      } else {
        toast.error('Failed to add city. Please try again.');
      }
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

      // Remove user's link to this place
      const { error } = await supabase
        .from('user_places')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', placeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cities', variables.countryIso2] });
      toast.success('City removed');
    },
    onError: (error) => {
      console.error('Failed to remove city:', error);
      toast.error('Failed to remove city. Please try again.');
    },
  });
}
