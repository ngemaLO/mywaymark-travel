// Simplified badge state - just visited or not visited
export type BadgeState = 'locked' | 'visited';

export interface Visit {
  id: string;
  user_id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  created_at: string | null;
  updated_at: string | null;
  trip_id: string | null;
  place_id: string | null;
  source_confidence: string | null;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useVisits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['visits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false });

      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!user,
  });
}

export function useVisitedCountries() {
  const { data: visits = [], ...rest } = useVisits();

  // Group visits by country
  const countryVisitMap = visits.reduce((acc, visit) => {
    const iso = visit.country_iso2;
    if (!acc[iso]) {
      acc[iso] = { visitCount: 0 };
    }
    acc[iso].visitCount++;
    return acc;
  }, {} as Record<string, { visitCount: number }>);

  const visitedIsos = Object.keys(countryVisitMap);

  const isVisited = (iso: string): boolean => {
    return visitedIsos.includes(iso);
  };

  const getVisitCount = (iso: string): number => {
    return countryVisitMap[iso]?.visitCount || 0;
  };

  return {
    visits,
    visitedIsos,
    isVisited,
    getVisitCount,
    ...rest,
  };
}

export function useVisitsByCountry(countryIso2: string) {
  const { data: visits = [], ...rest } = useVisits();
  
  const countryVisits = visits.filter(v => v.country_iso2 === countryIso2);
  
  // Calculate first visit year
  const firstVisitYear = countryVisits.length > 0
    ? countryVisits
        .map(v => new Date(v.arrival_date).getFullYear())
        .sort((a, b) => a - b)[0]
    : null;
  
  return {
    visits: countryVisits,
    visitCount: countryVisits.length,
    firstVisitYear,
    ...rest,
  };
}
