import { useState } from 'react';
import { CountryBadge } from './CountryBadge';
import { countries, continents } from '@/data/countries';
import { getCountryBadgeState, getVisitedCountryIsos } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function BadgeGrid() {
  const [showAll, setShowAll] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const navigate = useNavigate();
  const visitedIsos = getVisitedCountryIsos();

  // Get visited countries first, then others
  const sortedCountries = [...countries].sort((a, b) => {
    const aVisited = visitedIsos.includes(a.iso2);
    const bVisited = visitedIsos.includes(b.iso2);
    if (aVisited && !bVisited) return -1;
    if (!aVisited && bVisited) return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredCountries = selectedContinent
    ? sortedCountries.filter(c => c.continent === selectedContinent)
    : sortedCountries;

  const displayCountries = showAll ? filteredCountries : filteredCountries.slice(0, 12);

  return (
    <div className="space-y-4">
      {/* Continent filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedContinent(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selectedContinent === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </button>
        {continents.map(continent => (
          <button
            key={continent}
            onClick={() => setSelectedContinent(continent)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedContinent === continent
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {continent}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {displayCountries.map((country, index) => (
          <div
            key={country.iso2}
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CountryBadge
              country={country}
              state={getCountryBadgeState(country.iso2)}
              onClick={() => {
                if (visitedIsos.includes(country.iso2)) {
                  navigate(`/country/${country.iso2}`);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Show more/less button */}
      {filteredCountries.length > 12 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp className="ml-1 w-4 h-4" />
              </>
            ) : (
              <>
                Show All ({filteredCountries.length}) <ChevronDown className="ml-1 w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
