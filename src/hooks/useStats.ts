import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TravelStats {
  countriesVisited: number;
  citiesVisited: number;
}

export function useStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async (): Promise<TravelStats> => {
      if (!user) {
        return { countriesVisited: 0, citiesVisited: 0 };
      }

      // Get home bases to include in count
      const { data: homeBases, error: homeBasesError } = await supabase
        .from('home_bases')
        .select('*')
        .eq('user_id', user.id);

      if (homeBasesError) throw homeBasesError;

      // Get all visited countries
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('country_iso2, arrival_date')
        .eq('user_id', user.id);

      if (visitsError) throw visitsError;

      // Get unique countries from visits
      const uniqueCountries = new Set((visits || []).map(v => v.country_iso2));
      
      // Also add home base countries to the count (they count as visited)
      (homeBases || []).forEach(hb => uniqueCountries.add(hb.country_iso2));

      // Get cities count from user_places
      const { count: citiesCount, error: citiesError } = await supabase
        .from('user_places')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (citiesError) throw citiesError;

      return {
        countriesVisited: uniqueCountries.size,
        citiesVisited: citiesCount || 0,
      };
    },
    enabled: !!user,
  });
}
