import { Header } from '@/components/Header';
import { getCountryByIso } from '@/data/countries';
import { format, getYear } from 'date-fns';
import { Calendar, MapPin, ChevronDown, Plane, Edit2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}

interface Trip {
  id: string;
  title: string | null;
  start_date: string;
  end_date: string | null;
  source: string;
  visits: Visit[];
}

export default function Timeline() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch visits from database
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['timeline-visits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false });
      
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!user,
  });

  // Group visits by year (since we may not have trips, we'll group by year directly)
  const visitsByYear = visits.reduce((acc, visit) => {
    const year = getYear(new Date(visit.arrival_date));
    if (!acc[year]) acc[year] = [];
    acc[year].push(visit);
    return acc;
  }, {} as Record<number, Visit[]>);

  const years = Object.keys(visitsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view your timeline.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

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

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">No visits recorded yet.</p>
            <Button onClick={() => navigate('/')}>
              Add Your First Trip
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {years.map((year, yearIndex) => (
              <YearSection 
                key={year} 
                year={year} 
                visits={visitsByYear[year]}
                defaultOpen={yearIndex === 0}
                onCountryClick={(iso) => navigate(`/country/${iso}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface YearSectionProps {
  year: number;
  visits: Visit[];
  defaultOpen?: boolean;
  onCountryClick: (iso: string) => void;
}

function YearSection({ year, visits, defaultOpen = false, onCountryClick }: YearSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const uniqueCountries = [...new Set(visits.map(v => v.country_iso2))].length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-display font-bold text-foreground">
              {year}
            </span>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{uniqueCountries} countr{uniqueCountries !== 1 ? 'ies' : 'y'}</span>
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
          {visits.map((visit, index) => (
            <VisitCard 
              key={visit.id} 
              visit={visit} 
              index={index}
              onCountryClick={onCountryClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface VisitCardProps {
  visit: Visit;
  index: number;
  onCountryClick: (iso: string) => void;
}

function VisitCard({ visit, index, onCountryClick }: VisitCardProps) {
  const country = getCountryByIso(visit.country_iso2);
  if (!country) return null;
  
  return (
    <div 
      className="relative opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Timeline dot */}
      <div className="absolute -left-[calc(1rem+5px)] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
      
      <button
        onClick={() => onCountryClick(visit.country_iso2)}
        className="w-full card-elevated p-5 space-y-2 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            {country.iso2}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {country.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {visit.departure_date 
                    ? `${format(new Date(visit.arrival_date), 'MMM d, yyyy')} - ${format(new Date(visit.departure_date), 'MMM d, yyyy')}`
                    : format(new Date(visit.arrival_date), 'MMM d, yyyy')
                  }
                </span>
              </div>
              
              {visit.source === 'flight' && (
                <div className="flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Via flight</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
