import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  // Resolve scope to chapter
  const selectedChapter = useMemo(() => {
    if (scope === 'all') return null;
    if (scope === 'current') return currentChapter || null;
    return chapters.find(c => c.id === scope) || null;
  }, [scope, currentChapter, chapters]);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['recent-visits', user?.id, homeBase?.country_iso2, selectedChapter?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('id, country_iso2, arrival_date, departure_date, source')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false })
        .limit(15); // Fetch more to account for filtering
      
      if (error) throw error;
      
      let filtered = data as Visit[];
      
      // If chapter scope is active, filter by date range overlap
      if (selectedChapter) {
        const chapterEnd = selectedChapter.end_date || today;
        filtered = filtered.filter(v => {
          const visitEnd = v.departure_date || v.arrival_date;
          return visitEnd >= selectedChapter.start_date && v.arrival_date <= chapterEnd;
        });
      }
      
      // Filter out home base country, ongoing entries, and limit to 3
      filtered = filtered
        .filter(v => v.country_iso2 !== homeBase?.country_iso2)
        .filter(v => v.departure_date !== null) // Exclude ongoing
        .slice(0, 3);
      
      return filtered;
    },
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent Entries
        </h3>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (visits.length === 0) {
    return null; // Don't show empty state, just hide the section
  }

  return (
    <div className="content-surface p-5 space-y-4">
      <h3 className="section-heading">
        Recent Entries
      </h3>
      
      <div className="space-y-1">
        {visits.map((visit) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;
          
          return (
            <button
              key={visit.id}
              onClick={() => navigate(`/country/${visit.country_iso2}`)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors text-left group"
            >
              <div className="w-7 h-7 rounded bg-muted/60 text-muted-foreground/80 flex items-center justify-center font-medium text-xs shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                {country.iso2}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/85 truncate">
                  {country.name}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {format(new Date(visit.arrival_date), 'MMM yyyy')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button 
        className="ghost-pill w-full justify-center mt-2"
        onClick={() => {
          const params = scope !== 'all' && selectedChapter 
            ? `?chapter=${scope === 'current' ? 'current' : selectedChapter.id}` 
            : '';
          navigate(`/timeline${params}`);
        }}
      >
        View Full Timeline
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
