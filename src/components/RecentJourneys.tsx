import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { useChapters } from '@/hooks/useChapters';
import { useMemo } from 'react';

export type JourneyScopeValue = 'all' | 'current' | string;

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}

interface RecentJourneysProps {
  scope?: JourneyScopeValue;
}

export function RecentJourneys({ scope = 'all' }: RecentJourneysProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { homeBase } = useCurrentHomeBase();
  const { data: chapters = [] } = useChapters();

  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => 
    c.start_date <= today && (!c.end_date || c.end_date >= today)
  );

  const effectiveChapterId = useMemo(() => {
    if (scope === 'all') return null;
    if (scope === 'current') return currentChapter?.id || null;
    return scope;
  }, [scope, currentChapter]);

  const { data: chapterTripIds = [] } = useQuery({
    queryKey: ['chapter-trips-journeys', user?.id, effectiveChapterId],
    queryFn: async () => {
      if (!user || !effectiveChapterId) return [];
      const { data, error } = await supabase
        .from('chapter_trips')
        .select('trip_id')
        .eq('user_id', user.id)
        .eq('chapter_id', effectiveChapterId);
      if (error) throw error;
      return data.map(ct => ct.trip_id);
    },
    enabled: !!user && !!effectiveChapterId,
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['recent-journeys', user?.id, homeBase?.country_iso2, effectiveChapterId, chapterTripIds],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false })
        .limit(15);
      
      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data as Visit[];
      
      if (effectiveChapterId && chapterTripIds.length > 0) {
        filtered = filtered.filter(v => v.trip_id && chapterTripIds.includes(v.trip_id));
      } else if (effectiveChapterId && chapterTripIds.length === 0) {
        return [];
      }
      
      filtered = filtered
        .filter(v => v.country_iso2 !== homeBase?.country_iso2)
        .filter(v => v.departure_date !== null)
        .slice(0, 4);
      
      return filtered;
    },
    enabled: !!user && (scope === 'all' || chapterTripIds.length > 0 || !effectiveChapterId),
  });

  if (!user || isLoading || visits.length === 0) {
    return null;
  }

  return (
    <div className="journey-surface">
      <h3 className="section-heading-alt">
        Recent Journeys
      </h3>
      
      <div className="space-y-0">
        {visits.map((visit, index) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;
          
          return (
            <button
              key={visit.id}
              onClick={() => navigate(`/country/${visit.country_iso2}`)}
              className="w-full flex items-center gap-4 py-3 transition-colors text-left group hover:bg-white/40 dark:hover:bg-white/5 -mx-4 px-4 rounded-lg"
            >
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: country.flagPrimaryColor || 'hsl(var(--primary))' }}
                />
                {index < visits.length - 1 && (
                  <div className="w-px h-8 bg-border/40 mt-1" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {country.name}
                </p>
                <p className="text-xs" style={{ color: 'hsl(215 15% 55%)' }}>
                  {format(new Date(visit.arrival_date), 'MMM d, yyyy')}
                </p>
              </div>
              
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'hsl(215 15% 50%)' }} />
            </button>
          );
        })}
      </div>

      <button 
        className="ghost-pill w-full justify-center mt-3"
        onClick={() => {
          const params = scope !== 'all' && effectiveChapterId 
            ? `?chapter=${scope === 'current' ? 'current' : effectiveChapterId}` 
            : '';
          navigate(`/timeline${params}`);
        }}
      >
        View All Journeys
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}