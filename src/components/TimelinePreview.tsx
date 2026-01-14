import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { useChapters } from '@/hooks/useChapters';
import { useMemo } from 'react';

export type TimelineScopeValue = 'all' | 'current' | string;

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}

interface TimelinePreviewProps {
  scope?: TimelineScopeValue;
}

export function TimelinePreview({ scope = 'all' }: TimelinePreviewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { homeBase } = useCurrentHomeBase();
  const { data: chapters = [] } = useChapters();

  // Determine current chapter
  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => 
    c.start_date <= today && (!c.end_date || c.end_date >= today)
  );

  // Resolve scope to chapter ID
  const effectiveChapterId = useMemo(() => {
    if (scope === 'all') return null;
    if (scope === 'current') return currentChapter?.id || null;
    return scope; // It's a chapter ID
  }, [scope, currentChapter]);

  const selectedChapter = useMemo(() => {
    if (!effectiveChapterId) return null;
    return chapters.find(c => c.id === effectiveChapterId) || null;
  }, [effectiveChapterId, chapters]);

  // Fetch chapter_trips if chapter scope is active
  const { data: chapterTripIds = [] } = useQuery({
    queryKey: ['chapter-trips-timeline', user?.id, effectiveChapterId],
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
    queryKey: ['recent-visits', user?.id, homeBase?.country_iso2, effectiveChapterId, chapterTripIds],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false })
        .limit(15); // Fetch more to account for filtering
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      let filtered = data as Visit[];
      
      // If chapter scope is active, filter to chapter trips
      if (effectiveChapterId && chapterTripIds.length > 0) {
        filtered = filtered.filter(v => v.trip_id && chapterTripIds.includes(v.trip_id));
      } else if (effectiveChapterId && chapterTripIds.length === 0) {
        // Chapter has no trips
        return [];
      }
      
      // Filter out home base country, ongoing trips (current trips), and limit to 3
      filtered = filtered
        .filter(v => v.country_iso2 !== homeBase?.country_iso2)
        .filter(v => v.departure_date !== null) // Exclude ongoing trips
        .slice(0, 3);
      
      return filtered;
    },
    enabled: !!user && (scope === 'all' || chapterTripIds.length > 0 || !effectiveChapterId),
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent Trips
        </h3>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Remove unused title variable since we use static heading now

  if (visits.length === 0) {
    return null; // Don't show empty state, just hide the section
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Recent Trips
      </h3>
      
      <div className="space-y-2">
        {visits.map((visit) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;
          
          return (
            <button
              key={visit.id}
              onClick={() => navigate(`/country/${visit.country_iso2}`)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center font-medium text-xs shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                {country.iso2}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {country.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(visit.arrival_date), 'MMM yyyy')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <Button 
        variant="ghost" 
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground text-xs"
        onClick={() => {
          const params = scope !== 'all' && effectiveChapterId 
            ? `?chapter=${scope === 'current' ? 'current' : effectiveChapterId}` 
            : '';
          navigate(`/timeline${params}`);
        }}
      >
        View Full Timeline
        <ArrowRight className="w-3 h-3 ml-1.5" />
      </Button>
    </div>
  );
}
