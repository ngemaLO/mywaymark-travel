import { Link } from 'react-router-dom';
import { getCountryByIso } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { useVisits } from '@/hooks/useVisits';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { Compass, Flag, Home } from 'lucide-react';

interface TravelContextProps {
  travelingSince?: number | null;
  firstCountry?: { iso2: string; name: string } | null;
  homeCountry?: { iso2: string; name: string } | null;
}

export function TravelContext({ travelingSince, firstCountry, homeCountry }: TravelContextProps) {
  const segments: { icon: React.ReactNode; content: React.ReactNode }[] = [];

  if (travelingSince) {
    segments.push({
      icon: <Compass className="w-3.5 h-3.5" />,
      content: <span>Traveling since {travelingSince}</span>,
    });
  }

  if (firstCountry) {
    segments.push({
      icon: <Flag className="w-3.5 h-3.5" />,
      content: (
        <span>
          First stop:{' '}
          <Link to={`/country/${firstCountry.iso2}`} className="font-medium hover:underline underline-offset-2">
            {firstCountry.name}
          </Link>
        </span>
      ),
    });
  }

  if (homeCountry) {
    segments.push({
      icon: <Home className="w-3.5 h-3.5" />,
      content: (
        <span>
          Home base:{' '}
          <Link to={`/country/${homeCountry.iso2}`} className="font-medium hover:underline underline-offset-2">
            {homeCountry.name}
          </Link>
        </span>
      ),
    });
  }

  if (segments.length === 0) return null;

  return (
    <section className="flex justify-center">
      <div className="travel-summary-bar">
        {segments.map((segment, i) => (
          <div key={i} className="travel-summary-segment">
            <span className="travel-summary-icon">{segment.icon}</span>
            {segment.content}
          </div>
        ))}
      </div>
    </section>
  );
}

export function TravelContextConnected() {
  const { user } = useAuth();
  const { data: visits = [], isLoading } = useVisits();
  const { homeBase } = useCurrentHomeBase();

  if (!user || isLoading || visits.length === 0) return null;

  const sorted = [...visits].sort(
    (a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
  );
  const firstVisit = sorted[0];
  const travelingSince = firstVisit ? new Date(firstVisit.arrival_date).getFullYear() : null;
  const firstCountry = firstVisit ? getCountryByIso(firstVisit.country_iso2) ?? null : null;
  const homeCountry = homeBase ? getCountryByIso(homeBase.country_iso2) ?? null : null;

  return (
    <TravelContext
      travelingSince={travelingSince}
      firstCountry={firstCountry}
      homeCountry={homeCountry}
    />
  );
}
