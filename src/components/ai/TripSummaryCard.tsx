import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLatestTripSummary, useGenerateTripSummary } from '@/hooks/useTripSummaries';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CandidateTrip {
  id: string;
  title: string | null;
  start_date: string;
  end_date: string | null;
}

interface TripVisitLink {
  trip_id: string | null;
}

export function TripSummaryCard() {
  const { user } = useAuth();
  const { data: latestSummary, isLoading, error } = useLatestTripSummary();
  const generateSummary = useGenerateTripSummary();

  const { data: tripLinks = [], isLoading: linksLoading, error: linksError } = useQuery({
    queryKey: ['trip-summary-links', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error: tripsError } = await supabase
        .from('visits')
        .select('trip_id')
        .eq('user_id', user.id)
        .not('trip_id', 'is', null);

      if (tripsError) throw tripsError;
      return (data || []) as TripVisitLink[];
    },
    enabled: !!user,
  });

  const validTripIds = useMemo(
    () => [...new Set(tripLinks.map((link) => link.trip_id).filter((tripId): tripId is string => !!tripId))],
    [tripLinks]
  );

  const { data: candidateTrips = [], isLoading: tripsLoading, error: tripsError } = useQuery({
    queryKey: ['trip-summary-candidates', user?.id, validTripIds.join(',')],
    queryFn: async () => {
      if (!user || validTripIds.length === 0) return [];

      const { data, error: tripsError } = await supabase
        .from('trips')
        .select('id, title, start_date, end_date')
        .eq('user_id', user.id)
        .in('id', validTripIds)
        .order('start_date', { ascending: false });

      if (tripsError) throw tripsError;
      return (data || []) as CandidateTrip[];
    },
    enabled: !!user && validTripIds.length > 0,
  });

  const latestTrip = useMemo(() => candidateTrips[0] || null, [candidateTrips]);
  const loadError = error || linksError || tripsError;

  if (!user) {
    return null;
  }

  const handleGenerate = () => {
    if (!latestTrip) return;
    generateSummary.mutate({ tripId: latestTrip.id, regenerate: false });
  };

  const handleRegenerate = () => {
    if (!latestSummary?.trip_id) return;
    generateSummary.mutate({ tripId: latestSummary.trip_id, regenerate: true });
  };

  return (
    <article className="journal-entry">
      <p className="journal-date">AI Trip Summary</p>
      <h2 className="journal-title flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Latest trip recap
      </h2>

      {isLoading || linksLoading || tripsLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="journal-body journal-body--muted">Preparing your latest trip summary...</span>
        </div>
      ) : loadError ? (
        <div className="space-y-3">
          <p className="journal-body journal-body--muted">
            We couldn&apos;t load your trip summary right now.
          </p>
          {latestTrip && (
            <Button
              variant="ghost"
              className="journal-link"
              onClick={handleGenerate}
              disabled={generateSummary.isPending}
            >
              {generateSummary.isPending ? 'Generating...' : 'Try again'}
            </Button>
          )}
        </div>
      ) : latestSummary ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{latestSummary.title}</p>
            <p className="journal-body">{latestSummary.summary}</p>
          </div>

          {latestSummary.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {latestSummary.highlights.map((highlight, index) => (
                <span
                  key={`${latestSummary.id}-${index}`}
                  className="inline-flex rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {highlight}
                </span>
              ))}
            </div>
          )}

          <nav className="journal-actions">
            <Button
              variant="ghost"
              className="journal-link"
              onClick={handleRegenerate}
              disabled={generateSummary.isPending}
            >
              {generateSummary.isPending ? 'Refreshing...' : 'Regenerate summary'}
            </Button>
            <span className="journal-separator">or</span>
            <Link to="/timeline" className="journal-link journal-link--secondary">
              browse older trips
            </Link>
          </nav>
        </div>
      ) : latestTrip ? (
        <div className="space-y-3">
          <p className="journal-body journal-body--muted">
            Generate a concise recap for your most recent trip.
          </p>
          <nav className="journal-actions">
            <Button
              variant="ghost"
              className="journal-link"
              onClick={handleGenerate}
              disabled={generateSummary.isPending}
            >
              {generateSummary.isPending ? 'Generating...' : 'Generate summary'}
            </Button>
            <span className="journal-separator">or</span>
            <Link to="/timeline" className="journal-link journal-link--secondary">
              choose an older trip
            </Link>
          </nav>
        </div>
      ) : (
        <p className="journal-body journal-body--muted">
          Trip summaries will appear once you have trips with linked entries.
        </p>
      )}
    </article>
  );
}
