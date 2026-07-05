import { differenceInDays } from 'date-fns';
import { useVisits } from './useVisits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryByIso, getCountriesByContinent, continents } from '@/data/countries';

export interface ContinentStat {
  name: string;
  visited: number;
  total: number;
  pct: number;
}

export interface YearStat {
  year: number;
  count: number;
}

export interface StatsData {
  countriesVisited: number;
  citiesVisited: number;
  daysAbroad: number;
  yearsExploring: number;
  firstCountry: { name: string; year: number } | null;
  mostVisited: { name: string; count: number } | null;
  longestStay: { name: string; days: number } | null;
  latestTrip: { name: string; year: number } | null;
  continentStats: ContinentStat[];
  byYear: YearStat[];
  visitedIsos: string[];
}

export function useStatsData(): { data: StatsData | null; isLoading: boolean } {
  const { user } = useAuth();
  const { data: visits = [], isLoading: visitsLoading } = useVisits();

  const { data: citiesVisited = 0, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('user_places')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const isLoading = visitsLoading || citiesLoading;

  if (isLoading || visits.length === 0) {
    return { data: null, isLoading };
  }

  const today = new Date();

  // ── Unique countries ──────────────────────────────
  const visitedIsos = [...new Set(visits.map(v => v.country_iso2))];
  const countriesVisited = visitedIsos.length;

  // ── Days abroad (only visits with known duration) ─
  let daysAbroad = 0;
  for (const v of visits) {
    if (v.departure_date) {
      const d = differenceInDays(new Date(v.departure_date), new Date(v.arrival_date));
      daysAbroad += Math.max(d, 1);
    } else if (v.trip_id) {
      // Ongoing trip — count days so far
      const d = differenceInDays(today, new Date(v.arrival_date));
      daysAbroad += Math.max(d, 1);
    }
  }

  // ── Years exploring ───────────────────────────────
  const firstYear = Math.min(...visits.map(v => new Date(v.arrival_date).getFullYear()));
  const yearsExploring = today.getFullYear() - firstYear + 1;

  // ── First country ─────────────────────────────────
  const oldest = [...visits].sort(
    (a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
  )[0];
  const firstCountryData = getCountryByIso(oldest.country_iso2);
  const firstCountry = firstCountryData
    ? { name: firstCountryData.name, year: new Date(oldest.arrival_date).getFullYear() }
    : null;

  // ── Most visited country ──────────────────────────
  const countMap: Record<string, number> = {};
  for (const v of visits) {
    countMap[v.country_iso2] = (countMap[v.country_iso2] || 0) + 1;
  }
  const topIso = Object.entries(countMap)
    .filter(([, c]) => c > 1)
    .sort(([, a], [, b]) => b - a)[0];
  const mostVisited = topIso
    ? { name: getCountryByIso(topIso[0])?.name || topIso[0], count: topIso[1] }
    : null;

  // ── Longest single stay ───────────────────────────
  let longestDays = 0;
  let longestIso = '';
  for (const v of visits) {
    let d = 0;
    if (v.departure_date) {
      d = differenceInDays(new Date(v.departure_date), new Date(v.arrival_date));
    } else if (v.trip_id) {
      d = differenceInDays(today, new Date(v.arrival_date));
    }
    if (d > longestDays) {
      longestDays = d;
      longestIso = v.country_iso2;
    }
  }
  const longestStay = longestDays > 0
    ? { name: getCountryByIso(longestIso)?.name || longestIso, days: longestDays }
    : null;

  // ── Latest completed trip ─────────────────────────
  const completed = visits.filter(v => v.departure_date !== null);
  const latestVisit = completed[0]; // already ordered desc
  const latestCountryData = latestVisit ? getCountryByIso(latestVisit.country_iso2) : null;
  const latestTrip = latestCountryData && latestVisit
    ? { name: latestCountryData.name, year: new Date(latestVisit.arrival_date).getFullYear() }
    : null;

  // ── Continents ────────────────────────────────────
  const continentStats: ContinentStat[] = continents.map(c => {
    const total = getCountriesByContinent(c).length;
    const visited = visitedIsos.filter(iso => getCountryByIso(iso)?.continent === c).length;
    return { name: c, visited, total, pct: total > 0 ? Math.round((visited / total) * 100) : 0 };
  }).sort((a, b) => b.pct - a.pct);

  // ── By year ───────────────────────────────────────
  const yearMap: Record<number, number> = {};
  for (const v of visits) {
    const y = new Date(v.arrival_date).getFullYear();
    yearMap[y] = (yearMap[y] || 0) + 1;
  }
  const byYear: YearStat[] = Object.entries(yearMap)
    .map(([y, count]) => ({ year: Number(y), count }))
    .sort((a, b) => a.year - b.year);

  return {
    data: {
      countriesVisited,
      citiesVisited: citiesVisited as number,
      daysAbroad,
      yearsExploring,
      firstCountry,
      mostVisited,
      longestStay,
      latestTrip,
      continentStats,
      byYear,
      visitedIsos,
    },
    isLoading: false,
  };
}
