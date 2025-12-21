import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export type BadgeState = 'locked' | 'declared' | 'verified';

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

  // Group visits by country and calculate stats
  const countryVisitMap = visits.reduce((acc, visit) => {
    const iso = visit.country_iso2;
    if (!acc[iso]) {
      acc[iso] = { visitCount: 0, sources: new Set<string>() };
    }
    acc[iso].visitCount++;
    acc[iso].sources.add(visit.source);
    return acc;
  }, {} as Record<string, { visitCount: number; sources: Set<string> }>);

  // Determine badge state: verified if from google/flight, declared if manual only
  const visitedCountries = Object.entries(countryVisitMap).reduce((acc, [iso, data]) => {
    const hasVerifiedSource = data.sources.has('google') || data.sources.has('flight');
    acc[iso] = {
      state: hasVerifiedSource ? 'verified' : 'declared' as BadgeState,
      visitCount: data.visitCount,
    };
    return acc;
  }, {} as Record<string, { state: BadgeState; visitCount: number }>);

  const visitedIsos = Object.keys(visitedCountries);

  const getCountryBadgeState = (iso: string): BadgeState => {
    return visitedCountries[iso]?.state || 'locked';
  };

  const getVisitCount = (iso: string): number => {
    return visitedCountries[iso]?.visitCount || 0;
  };

  return {
    visits,
    visitedCountries,
    visitedIsos,
    getCountryBadgeState,
    getVisitCount,
    ...rest,
  };
}

export function useVisitsByCountry(countryIso2: string) {
  const { data: visits = [], ...rest } = useVisits();
  
  const countryVisits = visits.filter(v => v.country_iso2 === countryIso2);
  
  return {
    visits: countryVisits,
    visitCount: countryVisits.length,
    ...rest,
  };
}
