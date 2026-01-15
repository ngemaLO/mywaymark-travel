import { useState } from 'react';
import { countries, continents } from '@/data/countries';
import { useVisitedCountries, useVisitsByCountry } from '@/hooks/useVisits';
import { useNavigate } from 'react-router-dom';
import { Globe, ChevronDown, ChevronUp, Plus, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTripModal } from './AddTripModal';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

interface PlaceBadgeProps {
  country: {
    iso2: string;
    name: string;
    flagPrimaryColor?: string;
  };
  onClick?: () => void;
}

function PlaceBadge({ country, onClick }: PlaceBadgeProps) {
  const { visitCount, firstVisitYear } = useVisitsByCountry(country.iso2);
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className="group flex flex-col items-center gap-1 transition-all duration-200 hover:scale-105"
        >
          <div
            className="w-12 h-12 flex items-center justify-center rounded-lg font-semibold text-xs text-white transition-all duration-200 place-badge"
            style={{ backgroundColor: country.flagPrimaryColor || 'hsl(var(--primary))' }}
          >
            {country.iso2}
          </div>
          <span className="text-[11px] font-medium text-center max-w-[56px] truncate" style={{ color: 'hsl(215 20% 40%)' }}>
            {country.name}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-auto px-3 py-2 z-50"
        side="top"
        align="center"
      >
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-foreground">{country.name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{firstVisitYear || 'First time'}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{visitCount} {visitCount !== 1 ? 'times' : 'time'}</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function PlacesGrid() {
  const [showAll, setShowAll] = useState(false);
  const [showUnvisited, setShowUnvisited] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [addTripOpen, setAddTripOpen] = useState(false);
  const navigate = useNavigate();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();

  const visitedCountries = countries.filter(c => visitedIsos.includes(c.iso2));
  const sortedVisitedCountries = [...visitedCountries].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  const filteredCountries = selectedContinent
    ? sortedVisitedCountries.filter(c => c.continent === selectedContinent)
    : sortedVisitedCountries;

  const visitedContinents = [...new Set(visitedCountries.map(c => c.continent))];
  const displayCountries = showAll ? filteredCountries : filteredCountries.slice(0, 18);

  if (!user) {
    return (
      <div className="text-center py-6" style={{ color: 'hsl(215 15% 50%)' }}>
        Sign in to see your places
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="w-12 h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (visitedIsos.length === 0) {
    return (
      <>
        <div className="text-center py-8 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted/40 flex items-center justify-center">
            <MapPin className="w-7 h-7" style={{ color: 'hsl(215 15% 55%)' }} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-display font-semibold text-foreground">
              No places yet
            </h3>
            <p className="text-sm max-w-xs mx-auto" style={{ color: 'hsl(215 15% 50%)' }}>
              Start building your collection by adding your first trip.
            </p>
          </div>
          <Button onClick={() => setAddTripOpen(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Trip
          </Button>
        </div>
        <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Inline continent filters - muted and secondary */}
        {visitedContinents.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setSelectedContinent(null)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all",
                selectedContinent === null
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
              )}
            >
              All
            </button>
            {continents
              .filter(continent => visitedContinents.includes(continent))
              .map(continent => (
                <button
                  key={continent}
                  onClick={() => setSelectedContinent(continent)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all",
                    selectedContinent === continent
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  {continent}
                </button>
              ))}
          </div>
        )}

        {/* Compact badge grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {displayCountries.map((country, index) => (
            <div
              key={country.iso2}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <PlaceBadge
                country={country}
                onClick={() => navigate(`/country/${country.iso2}`)}
              />
            </div>
          ))}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {filteredCountries.length > 18 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="ghost-pill text-[11px]"
            >
              {showAll ? (
                <>Show Less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show All ({filteredCountries.length}) <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
          
          {!showUnvisited && (
            <button
              onClick={() => setShowUnvisited(true)}
              className="ghost-pill text-[11px]"
            >
              <Globe className="w-3 h-3" />
              Explore unvisited
            </button>
          )}
        </div>

        {/* Unvisited countries - collapsed by default */}
        {showUnvisited && (
          <UnvisitedSection 
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

function UnvisitedSection({ 
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
    <div className="pt-4 mt-4 border-t border-border/30 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'hsl(215 15% 50%)' }}>
          {unvisitedCountries.length} countries to explore
        </p>
        <button
          onClick={onHide}
          className="text-xs hover:underline"
          style={{ color: 'hsl(215 15% 55%)' }}
        >
          Hide
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 opacity-40">
        {unvisitedCountries.slice(0, 20).map((country) => (
          <div key={country.iso2} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
              {country.iso2}
            </div>
            <span className="text-[11px] text-muted-foreground text-center max-w-[56px] truncate">
              {country.name}
            </span>
          </div>
        ))}
      </div>
      {unvisitedCountries.length > 20 && (
        <p className="text-[11px] text-center" style={{ color: 'hsl(215 15% 60%)' }}>
          +{unvisitedCountries.length - 20} more
        </p>
      )}
    </div>
  );
}