import { Link } from 'react-router-dom';
import { Calendar, MapPin, Plane, Settings, Plus, BookOpen } from 'lucide-react';
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
      <div className="narrative-section">
        <div className="content-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  // No chapter - show prompt to create one
  if (!currentChapter) {
    return (
      <section className="narrative-section">
        <div className="chapter-prompt-card">
          <div className="flex items-center gap-3">
            <div className="chapter-prompt-icon">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-display text-foreground">
                Start a Chapter
              </h3>
              <p className="text-sm text-muted-foreground/70">
                Chapters help you organize travel by life phases
              </p>
            </div>
          </div>
          <Link to="/chapters">
            <Button variant="outline" size="sm" className="gap-1.5 mt-4">
              <Plus className="w-3.5 h-3.5" />
              Create Chapter
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  const homeCountry = currentChapter.home_base_country_iso2 
    ? getCountryByIso(currentChapter.home_base_country_iso2) 
    : null;

  const dateRange = currentChapter.end_date
    ? `${format(new Date(currentChapter.start_date), 'MMM yyyy')} - ${format(new Date(currentChapter.end_date), 'MMM yyyy')}`
    : `${format(new Date(currentChapter.start_date), 'MMM yyyy')} - Present`;

  return (
    <section className="narrative-section">
      <div className="content-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-heading-narrative">
            Current Chapter
          </h3>
          <Link to="/chapters">
            <button className="ghost-pill">
              <Settings className="w-3 h-3" />
              Manage
            </button>
          </Link>
        </div>

        <div className="space-y-2">
          <h4 className="text-base font-display text-foreground">
            {currentChapter.title}
          </h4>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateRange}</span>
          </div>

          {homeCountry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <MapPin className="w-3.5 h-3.5" />
              <span>Based in {homeCountry.name}</span>
            </div>
          )}

          {currentChapter.description && (
            <p className="text-sm text-muted-foreground/60 line-clamp-2 pt-1">
              {currentChapter.description}
            </p>
          )}
        </div>

        {/* Quick Stats - life context */}
        <div className="flex items-center gap-6 pt-3 border-t border-border/20">
          <div className="flex items-center gap-2">
            <Plane className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground/70">
              <span className="text-foreground/70">{chapterTrips.length}</span>
              {' '}trip{chapterTrips.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground/70">
              <span className="text-foreground/70">{countries.length}</span>
              {' '}countr{countries.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}