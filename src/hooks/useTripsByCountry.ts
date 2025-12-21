import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Trip {
  id: string;
  user_id: string;
  title: string | null;
  start_date: string;
  end_date: string | null;
  source: string;
  inferred: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useTripsByCountry(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trips-by-country', countryIso2, user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get visits for this country to find trip_ids
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('trip_id')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .not('trip_id', 'is', null);

      if (visitsError) throw visitsError;

      const tripIds = [...new Set(visits?.map(v => v.trip_id).filter(Boolean) || [])];

      if (tripIds.length === 0) return [];

      // Fetch trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .in('id', tripIds)
        .order('start_date', { ascending: false });

      if (tripsError) throw tripsError;

      return trips as Trip[];
    },
    enabled: !!user && !!countryIso2,
  });
}
