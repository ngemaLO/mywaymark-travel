import { Link } from 'react-router-dom';
import { useVisits } from '@/hooks/useVisits';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryByIso } from '@/data/countries';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';

export function TravelContext() {
  const { user } = useAuth();
  const { data: visits = [], isLoading } = useVisits();
  const { homeBase } = useCurrentHomeBase();

  if (!user || isLoading) return null;
  if (visits.length === 0) return null;

  // First country visited (earliest arrival_date)
  const sortedByArrival = [...visits].sort((a, b) => 
    new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
  );
  const firstVisit = sortedByArrival[0];
  const firstCountry = firstVisit ? getCountryByIso(firstVisit.country_iso2) : null;
  const firstYear = firstVisit ? new Date(firstVisit.arrival_date).getFullYear() : null;

  // Home base country
  const homeCountry = homeBase ? getCountryByIso(homeBase.country_iso2) : null;

  // Build parts for the elegant line
  const parts: React.ReactNode[] = [];

  if (firstYear) {
    parts.push(
      <span key="since">
        Traveling since {firstYear}
      </span>
    );
  }

  if (firstCountry) {
    parts.push(
      <span key="first">
        First stop:{' '}
        <Link 
          to={`/country/${firstCountry.iso2}`} 
          className="text-foreground/60 hover:text-foreground hover:underline underline-offset-2"
        >
          {firstCountry.name}
        </Link>
      </span>
    );
  }

  if (homeCountry) {
    parts.push(
      <span key="home">
        Home base:{' '}
        <Link 
          to={`/country/${homeCountry.iso2}`} 
          className="text-foreground/60 hover:text-foreground hover:underline underline-offset-2"
        >
          {homeCountry.name}
        </Link>
      </span>
    );
  }

  if (parts.length === 0) return null;

  return (
    <section className="flex justify-center">
      <p className="text-sm text-center text-muted-foreground/50">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="mx-2 text-muted-foreground/30">·</span>
            )}
          </span>
        ))}
      </p>
    </section>
  );
}