import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plane, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrentChapter, useChapterTrips, useChapterCountries } from '@/hooks/useChapters';
import { getCountryByIso } from '@/data/countries';
import { Skeleton } from '@/components/ui/skeleton';

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
      <div className="content-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-heading mb-0 pb-0 border-0">
            Current Chapter
          </h3>
          <Link to="/chapters">
            <button className="ghost-pill">
              <Settings className="w-3 h-3" />
              Manage
            </button>
          </Link>
        </div>

        <div className="space-y-2 pt-2">
          <h4 className="text-base font-display text-foreground">
            {currentChapter.title}
          </h4>
          
          <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(210 15% 50%)' }}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateRange}</span>
          </div>

          {homeCountry && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(210 15% 50%)' }}>
              <MapPin className="w-3.5 h-3.5" />
              <span>Based in {homeCountry.name}</span>
            </div>
          )}

          {currentChapter.description && (
            <p className="text-sm line-clamp-2" style={{ color: 'hsl(210 15% 55%)' }}>
              {currentChapter.description}
            </p>
          )}
        </div>

        {/* Quick Stats - softer */}
        <div className="flex items-center gap-6 pt-3 border-t border-border/20">
          <div className="flex items-center gap-2">
            <Plane className="w-3.5 h-3.5" style={{ color: 'hsl(210 15% 60%)' }} />
            <span className="text-sm" style={{ color: 'hsl(210 15% 50%)' }}>
              <span className="text-foreground/80">{chapterTrips.length}</span>
              {' '}trip{chapterTrips.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" style={{ color: 'hsl(210 15% 60%)' }} />
            <span className="text-sm" style={{ color: 'hsl(210 15% 50%)' }}>
              <span className="text-foreground/80">{countries.length}</span>
              {' '}countr{countries.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
