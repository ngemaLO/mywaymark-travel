import { useState } from 'react';
import { CountryBadge } from './CountryBadge';
import { CountryHoverCard } from './CountryHoverCard';
import { countries, continents } from '@/data/countries';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTripModal } from './AddTripModal';

export function BadgeGrid() {
  const [showAll, setShowAll] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [addTripOpen, setAddTripOpen] = useState(false);
  const navigate = useNavigate();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();

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

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Sign in to see your country collection
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="w-16 h-20" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (visitedIsos.length === 0) {
    return (
      <>
        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <MapPin className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-semibold text-foreground">
              No trips yet
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Start building your travel story by adding your first trip. Nothing is tracked automatically — you're in control.
            </p>
          </div>
          <Button onClick={() => setAddTripOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Trip
          </Button>
        </div>
        <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
      </>
    );
  }

  return (
    <>
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

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {displayCountries.map((country, index) => {
            const isVisited = visitedIsos.includes(country.iso2);
            return (
              <div
                key={country.iso2}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CountryHoverCard
                  countryIso2={country.iso2}
                  countryName={country.name}
                  enabled={isVisited}
                >
                  <CountryBadge
                    country={country}
                    visited={isVisited}
                    onClick={() => {
                      if (isVisited) {
                        navigate(`/country/${country.iso2}`);
                      }
                    }}
                  />
                </CountryHoverCard>
              </div>
            );
          })}
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
      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </>
  );
}
