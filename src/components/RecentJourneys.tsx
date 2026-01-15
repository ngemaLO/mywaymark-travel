import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
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
    <section className="journal-section">
      <h2 className="journal-section-title">Recently</h2>
      
      <ul className="journal-list">
        {visits.map((visit) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;
          
          return (
            <li key={visit.id}>
              <button
                onClick={() => navigate(`/country/${visit.country_iso2}`)}
                className="journal-list-item"
              >
                <span className="journal-list-place">{country.name}</span>
                <span className="journal-list-date">
                  {format(new Date(visit.arrival_date), 'MMM yyyy')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Link to="/timeline" className="journal-more">
        View full timeline →
      </Link>
    </section>
  );
}
