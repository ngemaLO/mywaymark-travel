import { Header } from '@/components/Header';
import { getCountryByIso } from '@/data/countries';
import { format, getYear, getMonth, differenceInDays } from 'date-fns';
import { ChevronDown, Loader2, BookOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EditVisitModal } from '@/components/EditVisitModal';
import { DeleteVisitDialog } from '@/components/DeleteVisitDialog';
import { useChapters } from '@/hooks/useChapters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}

type ChapterFilterValue = 'all' | 'current' | string;

// Southern hemisphere countries (below equator or mostly below)
const SOUTHERN_HEMISPHERE_COUNTRIES = new Set([
  // South America
  'AR', 'BO', 'BR', 'CL', 'PY', 'PE', 'UY', 'EC',
  // Oceania
  'AU', 'NZ', 'FJ', 'PG', 'VU', 'SB', 'TO', 'WS', 'TV', 'NR',
  // Southern Africa
  'ZA', 'NA', 'BW', 'ZW', 'MZ', 'ZM', 'MW', 'LS', 'SZ', 'MG', 'MU'
]);

// Tropical countries near equator (no real seasons)
const TROPICAL_COUNTRIES = new Set([
  'CO', 'VE', 'GY', 'SR', 'EC', // Northern South America
  'KE', 'UG', 'TZ', 'RW', 'BI', 'CD', 'CG', 'GA', 'CM', 'GQ', 'CF', // Central Africa
  'SG', 'MY', 'ID', 'PH', 'TH', 'VN', 'KH', 'LA', 'MM', 'BD', // Southeast Asia
  'IN', 'LK', 'MV', // South Asia
  'CR', 'PA', 'NI', 'HN', 'GT', 'SV', 'BZ', // Central America
  'JM', 'HT', 'DO', 'CU', 'BS', 'BB', 'TT', 'GD', 'AG', 'DM', 'LC', 'VC', 'KN', // Caribbean
  'PW', 'FM', 'MH', 'KI', // Pacific islands
]);

// Helper to get seasonal/temporal context based on country location
function getSeasonalContext(date: string, countryIso2: string): string {
  const month = getMonth(new Date(date));
  
  // Tropical countries - use wet/dry or just the month feeling
  if (TROPICAL_COUNTRIES.has(countryIso2)) {
    const tropicalSeasons = [
      'The new year',     // 0 - Jan
      'That February',    // 1 - Feb
      'Early in the year', // 2 - Mar
      'That spring',      // 3 - Apr
      'Mid-year',         // 4 - May
      'That June',        // 5 - Jun
      'Mid-year',         // 6 - Jul
      'Late summer',      // 7 - Aug
      'That September',   // 8 - Sep
      'That autumn',      // 9 - Oct
      'Late in the year', // 10 - Nov
      'Year\'s end',      // 11 - Dec
    ];
    return tropicalSeasons[month];
  }
  
  // Southern hemisphere - flip the seasons
  if (SOUTHERN_HEMISPHERE_COUNTRIES.has(countryIso2)) {
    const southernSeasons = [
      'That summer',      // 0 - Jan (summer in south)
      'Late summer',      // 1 - Feb
      'Early autumn',     // 2 - Mar
      'That autumn',      // 3 - Apr
      'Late autumn',      // 4 - May
      'Early winter',     // 5 - Jun
      'That winter',      // 6 - Jul
      'Late winter',      // 7 - Aug
      'Early spring',     // 8 - Sep
      'That spring',      // 9 - Oct
      'Late spring',      // 10 - Nov
      'Early summer',     // 11 - Dec
    ];
    return southernSeasons[month];
  }
  
  // Northern hemisphere (default)
  const northernSeasons = [
    'That winter',      // 0 - Jan
    'Late winter',      // 1 - Feb
    'Early spring',     // 2 - Mar
    'That spring',      // 3 - Apr
    'Late spring',      // 4 - May
    'Early summer',     // 5 - Jun
    'That summer',      // 6 - Jul
    'Late summer',      // 7 - Aug
    'Early autumn',     // 8 - Sep
    'That autumn',      // 9 - Oct
    'Late autumn',      // 10 - Nov
    'Early winter',     // 11 - Dec
  ];
  return northernSeasons[month];
}

// Format date range in a gentle, readable way
function formatDateRange(arrival: string, departure: string | null): string {
  const start = new Date(arrival);
  if (!departure) {
    return format(start, 'MMMM d, yyyy');
  }
  const end = new Date(departure);
  const sameYear = getYear(start) === getYear(end);
  const sameMonth = sameYear && getMonth(start) === getMonth(end);
  
  if (sameMonth) {
    return `${format(start, 'MMMM d')} – ${format(end, 'd, yyyy')}`;
  }
  if (sameYear) {
    return `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`;
  }
  return `${format(start, 'MMMM d, yyyy')} – ${format(end, 'MMMM d, yyyy')}`;
}

// Generate occasional memory moments
function generateMemoryMoments(visits: Visit[]): Map<number, string> {
  const moments = new Map<number, string>();
  if (visits.length < 3) return moments;

  // Find longest stay
  let longestStayIndex = -1;
  let longestDays = 0;
  visits.forEach((v, i) => {
    if (v.departure_date) {
      const days = differenceInDays(new Date(v.departure_date), new Date(v.arrival_date));
      if (days > longestDays) {
        longestDays = days;
        longestStayIndex = i;
      }
    }
  });
  if (longestStayIndex > 0 && longestDays > 7) {
    const country = getCountryByIso(visits[longestStayIndex].country_iso2);
    if (country) {
      moments.set(longestStayIndex, `Your longest time away — ${longestDays} days in ${country.name}.`);
    }
  }

  // Find repeated countries
  const countryCounts = new Map<string, number[]>();
  visits.forEach((v, i) => {
    const existing = countryCounts.get(v.country_iso2) || [];
    existing.push(i);
    countryCounts.set(v.country_iso2, existing);
  });
  countryCounts.forEach((indices, iso) => {
    if (indices.length >= 2 && indices[1] !== longestStayIndex) {
      const country = getCountryByIso(iso);
      if (country && !moments.has(indices[1])) {
        moments.set(indices[1], `You returned here more than once.`);
      }
    }
  });

  return moments;
}

export default function Timeline() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null);

  // Get chapter filter from URL
  const chapterParam = searchParams.get('chapter');
  const chapterFilter: ChapterFilterValue = chapterParam || 'all';

  const handleChapterChange = (value: ChapterFilterValue) => {
    if (value === 'all') {
      searchParams.delete('chapter');
    } else {
      searchParams.set('chapter', value);
    }
    setSearchParams(searchParams);
  };

  // Fetch chapters
  const { data: chapters = [] } = useChapters();

  // Determine current chapter if filter is 'current'
  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => 
    c.start_date <= today && (!c.end_date || c.end_date >= today)
  );

  const selectedChapter = chapterFilter === 'current' 
    ? currentChapter
    : chapterFilter !== 'all' 
      ? chapters.find(c => c.id === chapterFilter)
      : null;

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

  // Filter visits based on chapter selection (by date range)
  const filteredVisits = useMemo(() => {
    if (!selectedChapter) return visits;
    return visits.filter(v => {
      const visitStart = v.arrival_date;
      const visitEnd = v.departure_date || v.arrival_date;
      const chapterStart = selectedChapter.start_date;
      const chapterEnd = selectedChapter.end_date || today;
      return visitEnd >= chapterStart && visitStart <= chapterEnd;
    });
  }, [visits, selectedChapter, today]);

  // Group by year
  const groupedData = useMemo(() => {
    const visitsToGroup = chapterFilter !== 'all' ? filteredVisits : visits;
    
    const byYear = visitsToGroup.reduce((acc, visit) => {
      const year = getYear(new Date(visit.arrival_date));
      if (!acc[year]) acc[year] = [];
      acc[year].push(visit);
      return acc;
    }, {} as Record<number, Visit[]>);

    return {
      years: Object.keys(byYear).map(Number).sort((a, b) => b - a),
      byYear,
    };
  }, [chapterFilter, visits, filteredVisits]);

  // Generate memory moments for the visible entries
  const memoryMoments = useMemo(() => {
    const allVisible = chapterFilter !== 'all' ? filteredVisits : visits;
    return generateMemoryMoments(allVisible);
  }, [chapterFilter, visits, filteredVisits]);

  // Get filter display label
  const getFilterLabel = () => {
    if (chapterFilter === 'all') return 'Read all';
    if (chapterFilter === 'current') {
      return currentChapter ? currentChapter.title : 'This chapter';
    }
    return selectedChapter?.title || 'Select';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="timeline-page text-center py-16">
          <p className="journal-body--muted mb-8">
            Sign in to read your timeline.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const totalVisits = chapterFilter !== 'all' ? filteredVisits.length : visits.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="timeline-page">
        {/* Page opening */}
        <header className="mb-12">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h1 className="journal-title">Timeline</h1>
            
            {chapters.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="timeline-filter">
                    <span>{getFilterLabel()}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleChapterChange('all')}>
                    Read all
                  </DropdownMenuItem>
                  
                  {currentChapter && (
                    <DropdownMenuItem onClick={() => handleChapterChange('current')}>
                      This chapter
                      <span className="ml-auto text-xs text-muted-foreground">
                        {currentChapter.title}
                      </span>
                    </DropdownMenuItem>
                  )}

                  {chapters.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {chapters.map((chapter) => (
                        <DropdownMenuItem 
                          key={chapter.id} 
                          onClick={() => handleChapterChange(chapter.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{chapter.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(chapter.start_date), 'MMM yyyy')}
                              {chapter.end_date 
                                ? ` – ${format(new Date(chapter.end_date), 'MMM yyyy')}`
                                : ' – Present'
                              }
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Scope context */}
          {selectedChapter && (
            <div className="timeline-scope">
              <p className="timeline-scope-title">
                Entries from <em>{selectedChapter.title}</em>.{' '}
                <span 
                  className="timeline-scope-link"
                  onClick={() => handleChapterChange('all')}
                >
                  Read all time
                </span>
              </p>
            </div>
          )}
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16">
            <p className="journal-body--muted mb-8">
              Your story hasn't started yet.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Add your first entry
            </Button>
          </div>
        ) : chapterFilter !== 'all' && filteredVisits.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-4" />
            <p className="journal-body--muted mb-4">
              No entries during this chapter.
            </p>
            <button 
              className="timeline-scope-link"
              onClick={() => handleChapterChange('all')}
            >
              Read all time
            </button>
          </div>
        ) : (
          <>
            {/* The narrative spine */}
            <div className="timeline-spine">
              {groupedData.years.map((year, yearIndex) => {
                const yearVisits = groupedData.byYear[year];
                
                return (
                  <div key={year}>
                    {/* Year marker */}
                    <div className="timeline-year">{year}</div>
                    
                    {yearVisits.map((visit, entryIndex) => {
                      const country = getCountryByIso(visit.country_iso2);
                      if (!country) return null;
                      
                      // Calculate distance class for fading older entries
                      const globalIndex = groupedData.years
                        .slice(0, yearIndex)
                        .reduce((acc, y) => acc + groupedData.byYear[y].length, 0) + entryIndex;
                      
                      const distanceClass = 
                        globalIndex > 15 ? 'timeline-entry--very-distant' :
                        globalIndex > 8 ? 'timeline-entry--distant' : '';
                      
                      // Check for memory moment before this entry
                      const memoryBefore = memoryMoments.get(globalIndex);
                      
                      return (
                        <div key={visit.id}>
                          {/* Memory moment */}
                          {memoryBefore && (
                            <div className="timeline-memory">
                              <p className="timeline-memory-text">{memoryBefore}</p>
                            </div>
                          )}
                          
                          {/* The entry */}
                          <article className={`timeline-entry ${distanceClass}`}>
                            <div className="timeline-dot" />
                            
                            <h2 
                              className="timeline-place"
                              onClick={() => navigate(`/country/${visit.country_iso2}`)}
                            >
                              {country.name}
                            </h2>
                            
                            <p className="timeline-date">
                              {formatDateRange(visit.arrival_date, visit.departure_date)}
                            </p>
                            
                            <p className="timeline-season">
                              {getSeasonalContext(visit.arrival_date, visit.country_iso2)}
                            </p>
                            
                            {/* Actions - appear on hover */}
                            <div className="timeline-actions">
                              <span 
                                className="timeline-action"
                                onClick={() => setEditingVisit(visit)}
                              >
                                Edit
                              </span>
                              <span 
                                className="timeline-action"
                                onClick={() => navigate(`/country/${visit.country_iso2}`)}
                              >
                                View on map
                              </span>
                              <span 
                                className="timeline-action timeline-action--destructive"
                                onClick={() => setDeletingVisit(visit)}
                              >
                                Remove
                              </span>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
            {/* End of timeline */}
            {totalVisits > 0 && (
              <div className="timeline-end">
                <p className="timeline-end-text">
                  This is as far back as your journal goes — for now.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <EditVisitModal
        visit={editingVisit}
        open={!!editingVisit}
        onOpenChange={(open) => !open && setEditingVisit(null)}
      />

      <DeleteVisitDialog
        visit={deletingVisit}
        open={!!deletingVisit}
        onOpenChange={(open) => !open && setDeletingVisit(null)}
      />
    </div>
  );
}
