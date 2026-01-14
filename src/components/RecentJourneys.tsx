import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}

export function RecentJourneys() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { homeBase } = useCurrentHomeBase();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['recent-journeys-simple', user?.id, homeBase?.country_iso2],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .not('departure_date', 'is', null)
        .order('arrival_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Filter out home base and limit to 3
      return (data as Visit[])
        .filter(v => v.country_iso2 !== homeBase?.country_iso2)
        .slice(0, 3);
    },
    enabled: !!user,
  });

  if (!user || isLoading || visits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {visits.map((visit, index) => {
        const country = getCountryByIso(visit.country_iso2);
        if (!country) return null;
        
        return (
          <button
            key={visit.id}
            onClick={() => navigate(`/country/${visit.country_iso2}`)}
            className="w-full flex items-center gap-4 py-3 transition-colors text-left group hover:bg-white/40 dark:hover:bg-white/5 -mx-2 px-2 rounded-lg"
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
          </button>
        );
      })}
    </div>
  );
}