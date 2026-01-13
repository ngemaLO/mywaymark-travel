import { Link } from 'react-router-dom';
import { BookOpen, Calendar, MapPin, Plane, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrentChapter, useChapterTrips, useChapterCountries } from '@/hooks/useChapters';
import { getCountryByIso } from '@/data/countries';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function CurrentChapterCard() {
  const { currentChapter, isLoading } = useCurrentChapter();
  const { data: chapterTrips = [] } = useChapterTrips(currentChapter?.id || null);
  const { data: countries = [] } = useChapterCountries(currentChapter?.id || null);

  if (isLoading) {
    return (
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    );
  }

  if (!currentChapter) {
    return null;
  }

  const homeCountry = currentChapter.home_base_country_iso2 
    ? getCountryByIso(currentChapter.home_base_country_iso2) 
    : null;

  const dateRange = currentChapter.end_date
    ? `${format(new Date(currentChapter.start_date), 'MMM yyyy')} - ${format(new Date(currentChapter.end_date), 'MMM yyyy')}`
    : `${format(new Date(currentChapter.start_date), 'MMM yyyy')} - Present`;

  return (
    <section className="opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              Current Chapter
            </h3>
          </div>
          <Link to="/chapters">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Settings className="w-3.5 h-3.5" />
              Manage
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-foreground">
            {currentChapter.title}
          </h4>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{dateRange}</span>
          </div>

          {homeCountry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Based in {homeCountry.name}</span>
            </div>
          )}

          {currentChapter.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {currentChapter.description}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{chapterTrips.length}</span>
              <span className="text-muted-foreground"> trip{chapterTrips.length !== 1 ? 's' : ''}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{countries.length}</span>
              <span className="text-muted-foreground"> countr{countries.length !== 1 ? 'ies' : 'y'}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
