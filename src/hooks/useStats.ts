import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TravelStats {
  countriesVisited: number;
  citiesVisited: number;
  totalFlights: number;
}

export function useStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async (): Promise<TravelStats> => {
      if (!user) {
        return { countriesVisited: 0, citiesVisited: 0, totalFlights: 0 };
      }

      // Get unique countries from visits
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('country_iso2')
        .eq('user_id', user.id);

      if (visitsError) throw visitsError;

      const uniqueCountries = new Set(visits?.map(v => v.country_iso2) || []);

      // Get cities count from user_places
      const { count: citiesCount, error: citiesError } = await supabase
        .from('user_places')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (citiesError) throw citiesError;

      // Get trip count
      // Get flight count
      const { count: flightCount, error: flightsError } = await supabase
        .from('flights')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (flightsError) throw flightsError;

      return {
        countriesVisited: uniqueCountries.size,
        citiesVisited: citiesCount || 0,
        totalFlights: flightCount || 0,
      };
    },
    enabled: !!user,
  });
}
