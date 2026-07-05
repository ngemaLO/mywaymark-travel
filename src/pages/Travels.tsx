import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCountryByIso } from '@/data/countries';
import { format, getYear, getMonth, differenceInDays, isToday, formatDistanceToNow } from 'date-fns';
import {
  ChevronDown, Loader2, BookOpen, Search, Users,
  UserPlus, UserCheck, Handshake, ScanLine,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EditVisitModal } from '@/components/EditVisitModal';
import { DeleteVisitDialog } from '@/components/DeleteVisitDialog';
import { EndEntryModal } from '@/components/EndEntryModal';
import { useChapters } from '@/hooks/useChapters';
import { ChaptersSheet } from '@/components/ChaptersSheet';
import { useEndCurrentTrip } from '@/hooks/useCurrentTrip';
import { useGenerateLetter } from '@/hooks/useLetters';
import { useGenerateTripSummary, useTripSummariesByTripIds } from '@/hooks/useTripSummaries';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useFeed, useSearchProfiles, useFollow, useUnfollow,
  useIsFollowing, useFollowingCount, useFollowing,
} from '@/hooks/useFollows';
import { useActiveConnectionPartnerIds } from '@/hooks/useTripConnections';
import { ScanToConnectModal } from '@/components/connections/ScanToConnectModal';
import { cn } from '@/lib/utils';

// ── Shared helpers ────────────────────────────────────────────────────────────

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

// ── Mine tab (formerly Timeline) ──────────────────────────────────────────────

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}

type ChapterFilterValue = 'all' | 'current' | string;

const SOUTHERN_HEMISPHERE_COUNTRIES = new Set([
  'AR','CL','UY','PY','BR','AU','NZ','ZA','NA','BW','ZW','MZ','ZM','MW','LS','SZ','MG','AO',
]);

const TROPICAL_COUNTRIES = new Set([
  'CO','VE','EC','GY','SR','BO','PE','PA','CR','NI','HN','SV','GT','BZ','MX',
  'CU','JM','HT','DO','BS','BB','TT','GD','AG','DM','LC','VC','KN',
  'NG','GH','CI','CM','GA','CG','CD','CF','GQ','ST','BJ','TG','BF','ML','NE','TD','SN','GM','GN','GW','SL','LR','SS',
  'KE','UG','TZ','RW','BI','SO','DJ','ER','ET','KM','SC','MU',
  'IN','LK','MV','BD','MM','TH','VN','KH','LA','MY','SG','ID','TL','BN','PH',
  'PG','FJ','VU','SB','WS','TO','TV','NR','KI','PW','FM','MH',
]);

function getSeasonalContext(date: string, countryIso2: string): string {
  const month = getMonth(new Date(date));
  if (TROPICAL_COUNTRIES.has(countryIso2)) {
    return ['The new year','That February','Early in the year','That April','Mid-year','That June',
      'Mid-year','That August','That September','That October','Late in the year','Year\'s end'][month];
  }
  if (SOUTHERN_HEMISPHERE_COUNTRIES.has(countryIso2)) {
    return ['That summer','Late summer','Early autumn','That autumn','Late autumn','Early winter',
      'That winter','Late winter','Early spring','That spring','Late spring','Early summer'][month];
  }
  return ['That winter','Late winter','Early spring','That spring','Late spring','Early summer',
    'That summer','Late summer','Early autumn','That autumn','Late autumn','Early winter'][month];
}

function formatDateRange(arrival: string, departure: string | null): string {
  const start = new Date(arrival);
  if (!departure) return format(start, 'MMMM d, yyyy');
  const end = new Date(departure);
  const sameYear = getYear(start) === getYear(end);
  const sameMonth = sameYear && getMonth(start) === getMonth(end);
  if (sameMonth) return `${format(start, 'MMMM d')} – ${format(end, 'd, yyyy')}`;
  if (sameYear) return `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`;
  return `${format(start, 'MMMM d, yyyy')} – ${format(end, 'MMMM d, yyyy')}`;
}

function getOngoingArrivalCopy(arrivalDate: string): string {
  const arrival = new Date(arrivalDate);
  const daysAgo = differenceInDays(new Date(), arrival);
  if (isToday(arrival)) return 'You arrived today.';
  if (daysAgo === 1) return 'You arrived yesterday.';
  if (daysAgo <= 7) return `You've been here ${daysAgo} days.`;
  if (daysAgo <= 14) return `You've been here over a week.`;
  if (daysAgo <= 30) return `You've been here ${Math.floor(daysAgo / 7)} weeks.`;
  return `You arrived ${formatDistanceToNow(arrival, { addSuffix: true })}.`;
}

function getLiveDayCount(arrivalDate: string): string {
  const days = differenceInDays(new Date(), new Date(arrivalDate));
  if (days === 0) return 'Day 1';
  if (days <= 6) return `Since ${format(new Date(arrivalDate), 'EEEE')}`;
  return `Day ${days + 1}`;
}

function generateMemoryMoments(visits: Visit[]): Map<number, string> {
  const moments = new Map<number, string>();
  if (visits.length < 3) return moments;
  let longestStayIndex = -1;
  let longestDays = 0;
  visits.forEach((v, i) => {
    if (v.departure_date) {
      const days = differenceInDays(new Date(v.departure_date), new Date(v.arrival_date));
      if (days > longestDays) { longestDays = days; longestStayIndex = i; }
    }
  });
  if (longestStayIndex > 0 && longestDays > 7) {
    const country = getCountryByIso(visits[longestStayIndex].country_iso2);
    if (country) moments.set(longestStayIndex, `Your longest time away — ${longestDays} days in ${country.name}.`);
  }
  const countryCounts = new Map<string, number[]>();
  visits.forEach((v, i) => {
    const existing = countryCounts.get(v.country_iso2) || [];
    existing.push(i);
    countryCounts.set(v.country_iso2, existing);
  });
  countryCounts.forEach((indices, iso) => {
    if (indices.length >= 2 && indices[1] !== longestStayIndex) {
      const country = getCountryByIso(iso);
      if (country && !moments.has(indices[1])) moments.set(indices[1], `You returned here more than once.`);
    }
  });
  return moments;
}

const PAGE_SIZE = 30;

function MineTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null);
  const [endingVisit, setEndingVisit] = useState<Visit | null>(null);
  const [revealedEntryId, setRevealedEntryId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [chaptersSheetOpen, setChaptersSheetOpen] = useState(false);
  const endCurrentTrip = useEndCurrentTrip();
  const generateLetter = useGenerateLetter();
  const generateTripSummary = useGenerateTripSummary();

  const chapterParam = searchParams.get('chapter');
  const chapterFilter: ChapterFilterValue = chapterParam || 'all';

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [chapterFilter]);

  const handleEntryTap = useCallback((visitId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.timeline-action') || target.closest('.timeline-place')) return;
    setRevealedEntryId(prev => prev === visitId ? null : visitId);
  }, []);

  const handleChapterChange = useCallback((value: ChapterFilterValue) => {
    if (value === 'all') {
      searchParams.delete('chapter');
    } else {
      searchParams.set('chapter', value);
    }
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  const { data: chapters = [] } = useChapters();
  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => c.start_date <= today && (!c.end_date || c.end_date >= today));
  const selectedChapter = chapterFilter === 'current'
    ? currentChapter
    : chapterFilter !== 'all' ? chapters.find(c => c.id === chapterFilter) : null;

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['timeline-visits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('visits').select('*').eq('user_id', user.id).order('arrival_date', { ascending: false });
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!user,
  });

  const filteredVisits = useMemo(() => {
    if (!selectedChapter) return visits;
    return visits.filter(v => {
      const visitEnd = v.departure_date || v.arrival_date;
      const chapterEnd = selectedChapter.end_date || today;
      return visitEnd >= selectedChapter.start_date && v.arrival_date <= chapterEnd;
    });
  }, [visits, selectedChapter, today]);

  const tripIds = useMemo(
    () => [...new Set(visits.map(v => v.trip_id).filter((id): id is string => !!id))],
    [visits],
  );
  const { data: tripSummaries = [] } = useTripSummariesByTripIds(tripIds);
  const tripSummaryMap = useMemo(
    () => new Map(tripSummaries.map(s => [s.trip_id, s])),
    [tripSummaries],
  );

  const ongoingVisit = useMemo(() => visits.find(v => !v.departure_date), [visits]);
  const allCompleted = useMemo(() => {
    const source = chapterFilter !== 'all' ? filteredVisits : visits;
    return source.filter(v => v.departure_date);
  }, [chapterFilter, filteredVisits, visits]);
  const paginatedCompleted = useMemo(() => allCompleted.slice(0, visibleCount), [allCompleted, visibleCount]);
  const hasMore = allCompleted.length > visibleCount;

  const groupedData = useMemo(() => {
    const byYear = paginatedCompleted.reduce((acc, visit) => {
      const year = getYear(new Date(visit.arrival_date));
      if (!acc[year]) acc[year] = [];
      acc[year].push(visit);
      return acc;
    }, {} as Record<number, Visit[]>);
    return { years: Object.keys(byYear).map(Number).sort((a, b) => b - a), byYear };
  }, [paginatedCompleted]);

  const memoryMoments = useMemo(() => generateMemoryMoments(paginatedCompleted), [paginatedCompleted]);

  const getFilterLabel = () => {
    if (chapterFilter === 'all') return 'All visits';
    if (chapterFilter === 'current') return currentChapter ? currentChapter.title : 'This chapter';
    return selectedChapter?.title || 'Select';
  };

  const totalVisits = chapterFilter !== 'all' ? filteredVisits.length : visits.length;
  const hasOngoing = !!ongoingVisit;
  const renderedTripSummaryActions = new Set<string>();

  return (
    <>
      {/* Chapter filter + manage */}
      <div className="flex justify-end items-center gap-3 mb-6">
        {chapters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="timeline-filter">
                <span>{getFilterLabel()}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleChapterChange('all')}>All visits</DropdownMenuItem>
              {currentChapter && (
                <DropdownMenuItem onClick={() => handleChapterChange('current')}>
                  This chapter
                  <span className="ml-auto text-xs text-muted-foreground">{currentChapter.title}</span>
                </DropdownMenuItem>
              )}
              {chapters.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {chapters.map(chapter => (
                    <DropdownMenuItem key={chapter.id} onClick={() => handleChapterChange(chapter.id)}>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{chapter.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(chapter.start_date), 'MMM yyyy')}
                          {chapter.end_date ? ` – ${format(new Date(chapter.end_date), 'MMM yyyy')}` : ' – Present'}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          onClick={() => setChaptersSheetOpen(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {chapters.length === 0 ? 'Add chapters' : 'Manage'}
        </button>
      </div>

      <ChaptersSheet open={chaptersSheetOpen} onOpenChange={setChaptersSheetOpen} />

      {selectedChapter && (
        <div className="timeline-scope">
          <p className="timeline-scope-title">
            Entries from <em>{selectedChapter.title}</em>.{' '}
            <span className="timeline-scope-link" onClick={() => handleChapterChange('all')}>All visits</span>
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16">
          <p className="journal-body--muted mb-8">Your story hasn't started yet.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Log your first visit</Button>
        </div>
      ) : chapterFilter !== 'all' && filteredVisits.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-4" />
          <p className="journal-body--muted mb-4">No entries during this chapter.</p>
          <button className="timeline-scope-link" onClick={() => handleChapterChange('all')}>All visits</button>
        </div>
      ) : (
        <>
          {hasOngoing && ongoingVisit && getCountryByIso(ongoingVisit.country_iso2) && (
            <div className="timeline-now-divider">
              <div className="timeline-now-divider-line" />
              <span className="timeline-now-divider-label">Now</span>
              <div className="timeline-now-divider-line" />
            </div>
          )}
          {hasOngoing && <p className="timeline-now-whisper">Still unfolding.</p>}
          {hasOngoing && ongoingVisit && (() => {
            const country = getCountryByIso(ongoingVisit.country_iso2);
            if (!country) return null;
            return (
              <article className="timeline-entry timeline-entry--ongoing">
                <div className="timeline-dot timeline-dot--breathing" />
                <p className="timeline-live-meta">{getLiveDayCount(ongoingVisit.arrival_date)}</p>
                <h2 className="timeline-place timeline-place--ongoing" onClick={() => navigate(`/country/${ongoingVisit.country_iso2}`)}>
                  {isoToFlag(ongoingVisit.country_iso2)} {country.name}
                </h2>
                <p className="timeline-ongoing-copy">{getOngoingArrivalCopy(ongoingVisit.arrival_date)}</p>
                <p className="timeline-whisper">Still here.</p>
                <div className="timeline-ongoing-actions">
                  <span className="timeline-continue" onClick={() => setEditingVisit(ongoingVisit)}>Update entry</span>
                </div>
                <div className="timeline-margin-notes">
                  <span className="timeline-margin-note" onClick={() => navigate(`/country/${ongoingVisit.country_iso2}`)}>View place</span>
                  <span className="timeline-margin-note" onClick={() => setEndingVisit(ongoingVisit)}>End entry</span>
                </div>
              </article>
            );
          })()}

          {hasOngoing && (
            <div className="timeline-threshold">
              <div className="timeline-threshold-space" />
              <div className="timeline-threshold-line">
                <span className="timeline-threshold-label">Earlier visits</span>
              </div>
              <p className="timeline-threshold-whisper">The present settles into memory.</p>
            </div>
          )}

          <div className={`timeline-spine ${hasOngoing ? 'timeline-spine--past' : ''}`}>
            {groupedData.years.map((year, yearIndex) => {
              const yearVisits = groupedData.byYear[year];
              if (yearVisits.length === 0) return null;
              return (
                <div key={year}>
                  <div className="timeline-year">{year}</div>
                  {yearVisits.map((visit, entryIndex) => {
                    const country = getCountryByIso(visit.country_iso2);
                    if (!country) return null;
                    const globalIndex = groupedData.years
                      .slice(0, yearIndex)
                      .reduce((acc, y) => acc + groupedData.byYear[y].length, 0) + entryIndex;
                    const distanceClass =
                      globalIndex > 15 ? 'timeline-entry--very-distant' :
                      globalIndex > 8 ? 'timeline-entry--distant' : '';
                    const memoryBefore = memoryMoments.get(globalIndex);
                    return (
                      <div key={visit.id}>
                        {memoryBefore && (
                          <div className="timeline-memory">
                            <p className="timeline-memory-text">{memoryBefore}</p>
                          </div>
                        )}
                        <article
                          className={`timeline-entry timeline-entry--memory ${hasOngoing ? 'timeline-entry--past-threshold' : ''} ${distanceClass} ${revealedEntryId === visit.id ? 'timeline-entry--revealed' : ''}`}
                          onClick={(e) => handleEntryTap(visit.id, e)}
                        >
                          <div className={`timeline-dot ${hasOngoing ? 'timeline-dot--small' : ''}`} />
                          <h2 className="timeline-place" onClick={() => navigate(`/country/${visit.country_iso2}`)}>
                            {isoToFlag(visit.country_iso2)} {country.name}
                          </h2>
                          <p className="timeline-date">{formatDateRange(visit.arrival_date, visit.departure_date)}</p>
                          <p className="timeline-season">{getSeasonalContext(visit.arrival_date, visit.country_iso2)}</p>
                          <p className="timeline-tap-hint">Tap for options</p>
                          <div className="timeline-actions">
                            {visit.trip_id && !renderedTripSummaryActions.has(visit.trip_id) && (() => {
                              renderedTripSummaryActions.add(visit.trip_id);
                              return (
                                <span
                                  className="timeline-action"
                                  onClick={() => generateTripSummary.mutate({
                                    tripId: visit.trip_id!,
                                    regenerate: tripSummaryMap.has(visit.trip_id!),
                                  })}
                                >
                                  {generateTripSummary.isPending && generateTripSummary.variables?.tripId === visit.trip_id
                                    ? 'Working...'
                                    : tripSummaryMap.has(visit.trip_id)
                                    ? 'Regenerate summary'
                                    : 'Generate summary'}
                                </span>
                              );
                            })()}
                            <span className="timeline-action" onClick={() => setEditingVisit(visit)}>Edit</span>
                            <span className="timeline-action" onClick={() => navigate(`/country/${visit.country_iso2}`)}>View on map</span>
                            <span className="timeline-action timeline-action--destructive" onClick={() => setDeletingVisit(visit)}>Remove</span>
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center py-8">
              <button className="timeline-scope-link text-sm" onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}>
                Load {Math.min(PAGE_SIZE, allCompleted.length - visibleCount)} more visits
              </button>
            </div>
          )}
          {totalVisits > 0 && (
            <div className="timeline-end">
              <p className="timeline-end-text">This is as far back as your journal goes — for now.</p>
            </div>
          )}
        </>
      )}

      <EditVisitModal visit={editingVisit} open={!!editingVisit} onOpenChange={(open) => !open && setEditingVisit(null)} />
      <DeleteVisitDialog visit={deletingVisit} open={!!deletingVisit} onOpenChange={(open) => !open && setDeletingVisit(null)} />
      {endingVisit && (
        <EndEntryModal
          open={!!endingVisit}
          onOpenChange={(open) => !open && setEndingVisit(null)}
          countryIso2={endingVisit.country_iso2}
          arrivalDate={endingVisit.arrival_date}
          onConfirm={() => {
            const arrivalDate = endingVisit.arrival_date;
            const departureDate = new Date().toISOString().split('T')[0];
            endCurrentTrip.mutate(endingVisit.id, {
              onSuccess: () => {
                setEndingVisit(null);
                generateLetter.mutate({ scope: 'trip', period_start: arrivalDate, period_end: departureDate });
              },
            });
          }}
          isPending={endCurrentTrip.isPending}
        />
      )}
    </>
  );
}

// ── Friends tab (formerly Feed) ───────────────────────────────────────────────

function Avatar({ avatarUrl, name, size = 'md' }: { avatarUrl: string | null; name: string; size?: 'sm' | 'md' }) {
  const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={cn('rounded-full bg-primary flex items-center justify-center shrink-0 overflow-hidden font-bold text-primary-foreground', cls)}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : <span>{initials}</span>}
    </div>
  );
}

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { data: isFollowing, isLoading } = useIsFollowing(targetUserId);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const pending = follow.isPending || unfollow.isPending;
  if (isLoading) return <div className="w-20 h-7 rounded-full bg-muted animate-pulse" />;
  return isFollowing ? (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => unfollow.mutate(targetUserId)} disabled={pending}>
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
      Following
    </Button>
  ) : (
    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => follow.mutate(targetUserId)} disabled={pending}>
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      Follow
    </Button>
  );
}

function SearchSection() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useSearchProfiles(query);
  const { data: connectionPartnerIds = [] } = useActiveConnectionPartnerIds();
  const connectionSet = useMemo(() => new Set(connectionPartnerIds), [connectionPartnerIds]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by username…" value={query} onChange={e => setQuery(e.target.value)} className="pl-9" />
        {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
      {query.trim().length >= 2 && (
        <div className="space-y-1">
          {results.length === 0 && !isFetching ? (
            <p className="text-sm text-muted-foreground text-center py-4">No travelers found for "@{query}"</p>
          ) : (
            results.map(profile => (
              <div key={profile.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60">
                <Link to={`/u/${profile.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar avatarUrl={profile.avatar_url} name={profile.display_name || profile.username || '?'} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile.display_name || `@${profile.username}`}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                      {connectionSet.has(profile.user_id) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/70 rounded-full px-1.5 py-0.5 shrink-0">
                          <Handshake className="w-2.5 h-2.5" /> Met in person
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {user && profile.user_id !== user.id && <FollowButton targetUserId={profile.user_id} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FollowingList() {
  const { user } = useAuth();
  const { data: following = [] } = useFollowing(user?.id);
  const { data: connectionPartnerIds = [] } = useActiveConnectionPartnerIds();
  const connectionSet = useMemo(() => new Set(connectionPartnerIds), [connectionPartnerIds]);
  if (following.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Following</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {following.map(profile => (
          <Link key={profile.user_id} to={`/u/${profile.username}`} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
            <div className="relative">
              <Avatar avatarUrl={profile.avatar_url} name={profile.display_name || profile.username || '?'} />
              {connectionSet.has(profile.user_id) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center" title="Met in person">
                  <Handshake className="w-2 h-2 text-primary-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate w-full text-center">{profile.username}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FriendsTab() {
  const { user } = useAuth();
  const { data: feed = [], isLoading } = useFeed();
  const { data: followingCount = 0 } = useFollowingCount(user?.id);
  const { data: connectionPartnerIds = [] } = useActiveConnectionPartnerIds();
  const hasSocialSources = followingCount > 0 || connectionPartnerIds.length > 0;
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">See where your friends are going</p>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setScanOpen(true)}>
            <ScanLine className="w-3.5 h-3.5" />
            Scan to connect
          </Button>
        </div>

        <SearchSection />
        <FollowingList />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : !hasSocialSources ? (
          <div className="flex flex-col items-center text-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">No one in your feed yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Follow travelers above, or connect with someone you meet on the road to see their journeys here.
            </p>
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">None of the people you follow have logged any public trips yet.</p>
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
            <div className="space-y-2">
              {feed.map(item => {
                const country = getCountryByIso(item.country_iso2);
                const name = item.display_name || `@${item.username}` || 'A traveler';
                const timeAgo = formatDistanceToNow(new Date(item.arrival_date), { addSuffix: true });
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm">
                    <Link to={`/u/${item.username}`}>
                      <Avatar avatarUrl={item.avatar_url} name={name} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <Link to={`/u/${item.username}`} className="font-semibold hover:text-primary transition-colors">{name}</Link>
                        {' '}visited{' '}
                        <span className="font-medium">{isoToFlag(item.country_iso2)} {country?.name ?? item.country_iso2}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        {item.source === 'connection' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5">
                            <Handshake className="w-2.5 h-2.5" /> Met in person
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <ScanToConnectModal open={scanOpen} onOpenChange={setScanOpen} />
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Travels() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="timeline-page">
        <Tabs defaultValue="mine" className="w-full">
          <div className="flex items-baseline justify-between gap-4 mb-10">
            <h1 className="journal-title">Travels</h1>
            <TabsList className="h-8">
              <TabsTrigger value="mine" className="text-xs px-3 h-6">Mine</TabsTrigger>
              <TabsTrigger value="friends" className="text-xs px-3 h-6">Friends</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="mine" className="mt-0">
            <MineTab />
          </TabsContent>
          <TabsContent value="friends" className="mt-0">
            <FriendsTab />
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
