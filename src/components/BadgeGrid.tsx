import { useState } from 'react';
import { CountryBadge } from './CountryBadge';
import { CountryHoverCard } from './CountryHoverCard';
import { countries, continents } from '@/data/countries';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, MapPin, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTripModal } from './AddTripModal';

export function BadgeGrid() {
  const [showAll, setShowAll] = useState(false);
  const [showUnvisited, setShowUnvisited] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [addTripOpen, setAddTripOpen] = useState(false);
  const navigate = useNavigate();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();

  // Get visited countries only
  const visitedCountries = countries.filter(c => visitedIsos.includes(c.iso2));
  
  // Sort visited countries alphabetically
  const sortedVisitedCountries = [...visitedCountries].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Filter by continent
  const filteredCountries = selectedContinent
    ? sortedVisitedCountries.filter(c => c.continent === selectedContinent)
    : sortedVisitedCountries;

  // Get continents that have visited countries
  const visitedContinents = [...new Set(visitedCountries.map(c => c.continent))];

  const displayCountries = showAll ? filteredCountries : filteredCountries.slice(0, 12);

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Sign in to see your visited countries
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
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
              Start building your travel story by adding your first trip.
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
        {/* Continent filter pills - only show continents with visited countries */}
        {visitedContinents.length > 1 && (
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
            {continents
              .filter(continent => visitedContinents.includes(continent))
              .map(continent => (
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
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {displayCountries.map((country, index) => (
            <div
              key={country.iso2}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CountryHoverCard
                countryIso2={country.iso2}
                countryName={country.name}
                enabled={true}
              >
                <CountryBadge
                  country={country}
                  visited={true}
                  onClick={() => navigate(`/country/${country.iso2}`)}
                />
              </CountryHoverCard>
            </div>
          ))}
        </div>

        {/* Show more/less button */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {filteredCountries.length > 12 && (
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
          )}
          
          {/* Show all countries toggle */}
          {!showUnvisited && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnvisited(true)}
              className="text-muted-foreground/60 hover:text-muted-foreground text-xs"
            >
              <Globe className="w-3 h-3 mr-1" />
              Show all countries
            </Button>
          )}
        </div>

        {/* Unvisited countries section - only when toggled */}
        {showUnvisited && (
          <UnvisitedCountriesSection 
            visitedIsos={visitedIsos} 
            selectedContinent={selectedContinent}
            onHide={() => setShowUnvisited(false)}
          />
        )}
      </div>
      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </>
  );
}

function UnvisitedCountriesSection({ 
  visitedIsos, 
  selectedContinent,
  onHide 
}: { 
  visitedIsos: string[]; 
  selectedContinent: string | null;
  onHide: () => void;
}) {
  const unvisitedCountries = countries
    .filter(c => !visitedIsos.includes(c.iso2))
    .filter(c => !selectedContinent || c.continent === selectedContinent)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (unvisitedCountries.length === 0) return null;

  return (
    <div className="pt-6 border-t border-border/50 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unvisitedCountries.length} more countries to explore
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onHide}
          className="text-muted-foreground/60 hover:text-muted-foreground text-xs"
        >
          Hide
        </Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 opacity-50">
        {unvisitedCountries.slice(0, 24).map((country) => (
          <CountryBadge
            key={country.iso2}
            country={country}
            visited={false}
          />
        ))}
      </div>
      {unvisitedCountries.length > 24 && (
        <p className="text-xs text-muted-foreground/50 text-center">
          +{unvisitedCountries.length - 24} more
        </p>
      )}
    </div>
  );
}