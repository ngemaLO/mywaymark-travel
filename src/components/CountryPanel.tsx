import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Plus, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVisitedCountries, useVisitsByCountry } from '@/hooks/useVisits';
import { useCountryNote } from '@/hooks/useCountryNotes';
import { useCitiesByCountry } from '@/hooks/useCities';
import { getCountryByIso } from '@/data/countries';
import { FriendsWhoVisited } from '@/components/FriendsWhoVisited';
import { format } from 'date-fns';

interface CountryPanelProps {
  iso2: string | null;
  onClose: () => void;
  onLogVisit: (iso2: string) => void;
}

function isoToFlag(iso2: string) {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

function formatVisitDate(arrival: string, departure: string | null): string {
  const a = new Date(arrival);
  if (!departure) return format(a, 'MMM yyyy');
  const d = new Date(departure);
  if (a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth()) {
    return format(a, 'MMM yyyy');
  }
  return `${format(a, 'MMM yyyy')} – ${format(d, 'MMM yyyy')}`;
}

// Inner component — only mounted when iso2 is set, so hooks run cleanly
function PanelContent({ iso2, onClose, onLogVisit }: { iso2: string; onClose: () => void; onLogVisit: (iso2: string) => void }) {
  const navigate = useNavigate();
  const { visitedIsos } = useVisitedCountries();
  const isVisited = visitedIsos.includes(iso2);
  const country = getCountryByIso(iso2);

  const { visits, isLoading: visitsLoading } = useVisitsByCountry(iso2);
  const { data: note } = useCountryNote(iso2);
  const { data: cities = [] } = useCitiesByCountry(iso2);

  const latestVisit = visits[0];
  const visitCount = visits.length;

  if (!country) return null;

  return (
    <div className="country-panel-content">
      {/* Handle + close */}
      <div className="country-panel-header">
        <div className="country-panel-handle" />
        <button className="country-panel-close" onClick={onClose} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Identity */}
      <div className="country-panel-identity">
        <span className="country-panel-flag">{isoToFlag(iso2)}</span>
        <div>
          <h2 className="country-panel-name">{country.name}</h2>
          <p className="country-panel-continent">{country.continent}</p>
        </div>
      </div>

      {isVisited ? (
        <>
          {/* Visit count + last date */}
          <div className="country-panel-meta">
            <span className="country-panel-meta-item">
              <Clock className="w-3.5 h-3.5" />
              {visitCount === 1 ? 'Visited once' : `Visited ${visitCount} times`}
            </span>
            {latestVisit && (
              <span className="country-panel-meta-item">
                <MapPin className="w-3.5 h-3.5" />
                Last: {formatVisitDate(latestVisit.arrival_date, latestVisit.departure_date)}
              </span>
            )}
          </div>

          {/* Cities */}
          {cities.length > 0 && (
            <div className="country-panel-cities">
              {cities.slice(0, 6).map(city => (
                <span key={city.id} className="country-panel-city-tag">{city.name}</span>
              ))}
              {cities.length > 6 && (
                <span className="country-panel-city-tag country-panel-city-tag--more">
                  +{cities.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Note preview */}
          {note?.note && (
            <p className="country-panel-note">"{note.note}"</p>
          )}

          {/* Friends who've been here */}
          <FriendsWhoVisited iso2={iso2} variant="compact" />

          {/* Actions */}
          <div className="country-panel-actions">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => { onClose(); onLogVisit(iso2); }}
            >
              <Plus className="w-3.5 h-3.5" />
              Log another visit
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => { onClose(); navigate(`/country/${iso2}`); }}
            >
              View full profile
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Unvisited state */}
          <p className="country-panel-unvisited">
            You haven't visited {country.name} yet.
          </p>

          {/* Friends who've been here */}
          <FriendsWhoVisited iso2={iso2} variant="compact" />

          <div className="country-panel-actions">
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() => { onClose(); onLogVisit(iso2); }}
            >
              <Plus className="w-3.5 h-3.5" />
              Log a visit to {country.name}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function CountryPanel({ iso2, onClose, onLogVisit }: CountryPanelProps) {
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Animate in when iso2 is set
  useEffect(() => {
    if (iso2) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [iso2]);

  if (!iso2) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className={`country-panel-backdrop ${visible ? 'country-panel-backdrop--visible' : ''}`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div className={`country-panel ${visible ? 'country-panel--visible' : ''}`}>
        <PanelContent iso2={iso2} onClose={onClose} onLogVisit={onLogVisit} />
      </div>
    </>
  );
}
