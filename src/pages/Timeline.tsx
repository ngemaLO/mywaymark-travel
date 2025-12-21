import { Header } from '@/components/Header';
import { mockTrips } from '@/data/mockData';
import { getCountryByIso } from '@/data/countries';
import { format, getYear } from 'date-fns';
import { Calendar, MapPin, ChevronDown, Plane, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function Timeline() {
  const navigate = useNavigate();
  
  // Group trips by year
  const tripsByYear = mockTrips.reduce((acc, trip) => {
    const year = getYear(new Date(trip.startDate));
    if (!acc[year]) acc[year] = [];
    acc[year].push(trip);
    return acc;
  }, {} as Record<number, typeof mockTrips>);

  const years = Object.keys(tripsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        {/* Page Header */}
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Your Timeline
          </h1>
          <p className="text-muted-foreground">
            A chronological view of all your travels, grouped by year.
          </p>
        </section>

        {/* Timeline */}
        <div className="space-y-8">
          {years.map((year, yearIndex) => (
            <YearSection 
              key={year} 
              year={year} 
              trips={tripsByYear[year]}
              defaultOpen={yearIndex === 0}
              onCountryClick={(iso) => navigate(`/country/${iso}`)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

interface YearSectionProps {
  year: number;
  trips: typeof mockTrips;
  defaultOpen?: boolean;
  onCountryClick: (iso: string) => void;
}

function YearSection({ year, trips, defaultOpen = false, onCountryClick }: YearSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const totalCountries = [...new Set(trips.flatMap(t => t.visits.map(v => v.countryIso2)))].length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-display font-bold text-foreground">
              {year}
            </span>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{trips.length} trips</span>
              <span>•</span>
              <span>{totalCountries} countries</span>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="pt-4 space-y-4 pl-4 border-l-2 border-border ml-6">
          {trips.map((trip, index) => (
            <TripCard 
              key={trip.id} 
              trip={trip} 
              index={index}
              onCountryClick={onCountryClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface TripCardProps {
  trip: typeof mockTrips[0];
  index: number;
  onCountryClick: (iso: string) => void;
}

function TripCard({ trip, index, onCountryClick }: TripCardProps) {
  const visitCountries = [...new Set(trip.visits.map(v => v.countryIso2))];
  
  return (
    <div 
      className="relative opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Timeline dot */}
      <div className="absolute -left-[calc(1rem+5px)] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
      
      <div className="card-elevated p-5 space-y-4">
        {/* Trip Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold text-foreground">
              {trip.title || 'Untitled Trip'}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d')}
                </span>
              </div>
              
              {trip.source === 'flight' && (
                <div className="flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Via flight</span>
                </div>
              )}
            </div>
          </div>
          
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Visits */}
        <div className="space-y-2">
          {trip.visits.map(visit => {
            const country = getCountryByIso(visit.countryIso2);
            if (!country) return null;
            
            return (
              <button
                key={visit.id}
                onClick={() => onCountryClick(visit.countryIso2)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {country.iso2}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{country.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {visit.departureDate 
                        ? `${format(new Date(visit.arrivalDate), 'MMM d')} - ${format(new Date(visit.departureDate), 'MMM d')}`
                        : format(new Date(visit.arrivalDate), 'MMM d')
                      }
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
