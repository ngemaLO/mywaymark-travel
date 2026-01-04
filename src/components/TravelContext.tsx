import { Link } from 'react-router-dom';
import { useVisits } from '@/hooks/useVisits';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';

interface Trip {
  id: string;
  title: string | null;
  start_date: string;
  created_at: string | null;
}

export function TravelContext() {
  const { user } = useAuth();
  const { data: visits = [], isLoading: visitsLoading } = useVisits();
  
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, start_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
  });

  if (!user || visitsLoading || tripsLoading) return null;
  if (visits.length === 0 && trips.length === 0) return null;

  // First country visited (earliest arrival_date)
  const sortedByArrival = [...visits].sort((a, b) => 
    new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
  );
  const firstVisit = sortedByArrival[0];
  const firstCountry = firstVisit ? getCountryByIso(firstVisit.country_iso2) : null;
  const firstYear = firstVisit ? new Date(firstVisit.arrival_date).getFullYear() : null;

  // Most recent country visited (latest arrival_date)
  const mostRecentVisit = sortedByArrival[sortedByArrival.length - 1];
  const mostRecentCountry = mostRecentVisit ? getCountryByIso(mostRecentVisit.country_iso2) : null;
  const mostRecentDate = mostRecentVisit ? new Date(mostRecentVisit.arrival_date) : null;

  // Most recently added trip (by created_at)
  const lastAddedTrip = trips[0];
  const lastAddedTripDate = lastAddedTrip?.created_at ? new Date(lastAddedTrip.created_at) : null;

  // Check if first and most recent are the same (only one visit)
  const showMostRecent = mostRecentVisit && firstVisit && mostRecentVisit.id !== firstVisit.id;

  const formatMonthYear = (date: Date) => format(date, 'MMM yyyy');

  const milestones: { key: string; content: React.ReactNode }[] = [];

  if (firstYear) {
    milestones.push({
      key: 'traveling-since',
      content: <span className="text-muted-foreground">Traveling since {firstYear}</span>
    });
  }

  if (firstCountry && firstVisit) {
    milestones.push({
      key: 'first-country',
      content: (
        <span className="text-muted-foreground">
          First country:{' '}
          <Link 
            to={`/country/${firstCountry.iso2}`} 
            className="text-foreground hover:underline underline-offset-2"
          >
            {firstCountry.name}
          </Link>
          {' '}({new Date(firstVisit.arrival_date).getFullYear()})
        </span>
      )
    });
  }

  if (showMostRecent && mostRecentCountry && mostRecentDate) {
    milestones.push({
      key: 'most-recent',
      content: (
        <span className="text-muted-foreground">
          Most recent:{' '}
          <Link 
            to={`/country/${mostRecentCountry.iso2}`} 
            className="text-foreground hover:underline underline-offset-2"
          >
            {mostRecentCountry.name}
          </Link>
          {' '}({formatMonthYear(mostRecentDate)})
        </span>
      )
    });
  }

  if (lastAddedTrip && lastAddedTripDate) {
    // Try to find the country for the last added trip
    const tripVisit = visits.find(v => v.trip_id === lastAddedTrip.id);
    const tripCountry = tripVisit ? getCountryByIso(tripVisit.country_iso2) : null;
    
    if (tripCountry) {
      milestones.push({
        key: 'last-added',
        content: (
          <span className="text-muted-foreground">
            Last added:{' '}
            <Link 
              to={`/country/${tripCountry.iso2}`} 
              className="text-foreground hover:underline underline-offset-2"
            >
              {tripCountry.name}
            </Link>
            {' '}({formatMonthYear(lastAddedTripDate)})
          </span>
        )
      });
    }
  }

  if (milestones.length === 0) return null;

  return (
    <section className="py-2">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {milestones.map(milestone => (
          <div key={milestone.key}>{milestone.content}</div>
        ))}
      </div>
    </section>
  );
}
