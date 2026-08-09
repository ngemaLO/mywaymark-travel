import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { cn } from '@/lib/utils';
import { attachJourneyThumbnails } from '@/lib/journeyPhotos';

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

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['recent-journeys-photos', user?.id, homeBase?.country_iso2],
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

      const recent = (data as Visit[])
        .filter(v => v.country_iso2 !== homeBase?.country_iso2)
        .slice(0, 3);

      return attachJourneyThumbnails(recent);
    },
    enabled: !!user,
  });

  if (!user || isLoading || journeys.length === 0) {
    return null;
  }

  return (
    <section className="journal-section">
      <h2 className="journal-section-title">Recently</h2>

      <div className="journal-photo-row">
        {journeys.map(({ visit, imageUrl, isFlagFallback }) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;

          return (
            <button
              key={visit.id}
              onClick={() => navigate(`/country/${visit.country_iso2}`)}
              className="journal-photo-card"
            >
              <div
                className={cn('journal-photo-card-image', isFlagFallback && 'journal-photo-card-image--flag')}
                style={isFlagFallback ? { backgroundColor: `${country.flagPrimaryColor}22` } : undefined}
              >
                <img src={imageUrl} alt="" loading="lazy" />
              </div>
              <div className="journal-photo-card-caption">
                <span className="journal-photo-card-place">{country.name}</span>
                <span className="journal-photo-card-date">
                  {format(new Date(visit.arrival_date), 'MMM yyyy')}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Link to="/timeline" className="journal-more">
        View full timeline →
      </Link>
    </section>
  );
}
