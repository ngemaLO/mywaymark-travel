import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { ChevronRight } from 'lucide-react';

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
    <div className="recent-journeys-section">
      <div className="recent-journeys-header">
        <h3 className="section-heading-narrative">Recent Journeys</h3>
      </div>
      
      <div className="recent-journeys-timeline">
        {visits.map((visit, index) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;
          
          return (
            <button
              key={visit.id}
              onClick={() => navigate(`/country/${visit.country_iso2}`)}
              className="recent-journey-item group"
            >
              {/* Timeline dot and line */}
              <div className="journey-timeline-indicator">
                <div 
                  className="journey-dot"
                  style={{ backgroundColor: country.flagPrimaryColor || 'hsl(var(--primary))' }}
                />
                {index < visits.length - 1 && (
                  <div className="journey-line" />
                )}
              </div>
              
              {/* Content */}
              <div className="journey-content">
                <p className="journey-country group-hover:text-primary transition-colors">
                  {country.name}
                </p>
                <p className="journey-date">
                  {format(new Date(visit.arrival_date), 'MMM d, yyyy')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* View full timeline CTA */}
      <Link to="/timeline" className="view-timeline-link group">
        <span>View full timeline</span>
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}