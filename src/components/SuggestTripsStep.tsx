import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, ChevronDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useSuggestedTripsForChapter, useAddChapterTrips, type Chapter } from '@/hooks/useChapters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SuggestTripsStepProps {
  chapter: Chapter;
  onComplete: () => void;
}

interface Trip {
  id: string;
  title: string | null;
  start_date: string;
  end_date: string | null;
}

export function SuggestTripsStep({ chapter, onComplete }: SuggestTripsStepProps) {
  const { user } = useAuth();
  const { data: suggestedTrips = [], isLoading: loadingSuggested } = useSuggestedTripsForChapter(chapter);
  const addChapterTrips = useAddChapterTrips();

  // Fetch all user trips for manual selection
  const { data: allTrips = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-trips', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
  });

  const suggestedIds = suggestedTrips.map(t => t.id);
  const otherTrips = allTrips.filter(t => !suggestedIds.includes(t.id));

  const [selectedSuggested, setSelectedSuggested] = useState<Set<string>>(new Set());
  const [selectedManual, setSelectedManual] = useState<Set<string>>(new Set());
  const [showOther, setShowOther] = useState(false);

  // Pre-select all suggested trips
  useEffect(() => {
    if (suggestedTrips.length > 0) {
      setSelectedSuggested(new Set(suggestedTrips.map(t => t.id)));
    }
  }, [suggestedTrips]);

  const toggleSuggested = (tripId: string) => {
    setSelectedSuggested(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const toggleManual = (tripId: string) => {
    setSelectedManual(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const selectAllSuggested = () => {
    setSelectedSuggested(new Set(suggestedTrips.map(t => t.id)));
  };

  const clearAllSuggested = () => {
    setSelectedSuggested(new Set());
  };

  const handleConfirm = async () => {
    // Add suggested trips with 'auto' method
    const autoTripIds = Array.from(selectedSuggested);
    // Add manual trips with 'manual' method
    const manualTripIds = Array.from(selectedManual);

    if (autoTripIds.length > 0) {
      await addChapterTrips.mutateAsync({
        chapterId: chapter.id,
        tripIds: autoTripIds,
        addedMethod: 'auto',
      });
    }

    if (manualTripIds.length > 0) {
      await addChapterTrips.mutateAsync({
        chapterId: chapter.id,
        tripIds: manualTripIds,
        addedMethod: 'manual',
      });
    }

    onComplete();
  };

  const isLoading = loadingSuggested || loadingAll;
  const totalSelected = selectedSuggested.size + selectedManual.size;
  const allSuggestedSelected = selectedSuggested.size === suggestedTrips.length && suggestedTrips.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="space-y-4 pr-4">
          {/* Suggested Trips */}
          {suggestedTrips.length > 0 ? (
            <div className="space-y-3">
              {/* Header with count */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">
                    Suggested Trips
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllSuggested}
                      className={cn(
                        "text-xs transition-colors",
                        allSuggestedSelected 
                          ? "text-muted-foreground/50 cursor-default" 
                          : "text-primary hover:text-primary/80"
                      )}
                      disabled={allSuggestedSelected}
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground/30">•</span>
                    <button
                      type="button"
                      onClick={clearAllSuggested}
                      className={cn(
                        "text-xs transition-colors",
                        selectedSuggested.size === 0 
                          ? "text-muted-foreground/50 cursor-default" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      disabled={selectedSuggested.size === 0}
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  We found {suggestedTrips.length} trip{suggestedTrips.length !== 1 ? 's' : ''} that overlap{suggestedTrips.length === 1 ? 's' : ''} this chapter's dates.
                </p>
              </div>
              
              {/* Trip list */}
              <div className="space-y-2">
                {suggestedTrips.map((trip) => (
                  <TripCheckItem
                    key={trip.id}
                    trip={trip}
                    checked={selectedSuggested.has(trip.id)}
                    onCheckedChange={() => toggleSuggested(trip.id)}
                    subtext="Overlaps chapter date range"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No trips found that overlap with this chapter's dates.
              </p>
              <p className="text-xs text-muted-foreground">
                You can manually add trips from outside the date range below.
              </p>
            </div>
          )}

          {/* Other Trips */}
          {otherTrips.length > 0 && (
            <Collapsible open={showOther} onOpenChange={setShowOther}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span>Add trips from outside date range ({otherTrips.length})</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showOther && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pt-2">
                  {otherTrips.map((trip) => (
                    <TripCheckItem
                      key={trip.id}
                      trip={trip}
                      checked={selectedManual.has(trip.id)}
                      onCheckedChange={() => toggleManual(trip.id)}
                      subtext="Outside chapter date range"
                      subtextMuted
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {totalSelected} trip{totalSelected !== 1 ? 's' : ''} selected
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onComplete}>
            Skip
          </Button>
          <Button onClick={handleConfirm} disabled={addChapterTrips.isPending}>
            {addChapterTrips.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TripCheckItemProps {
  trip: Trip;
  checked: boolean;
  onCheckedChange: () => void;
  subtext?: string;
  subtextMuted?: boolean;
}

function TripCheckItem({ trip, checked, onCheckedChange, subtext, subtextMuted }: TripCheckItemProps) {
  const dateDisplay = trip.end_date
    ? `${format(new Date(trip.start_date), 'MMM d, yyyy')} - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`
    : format(new Date(trip.start_date), 'MMM d, yyyy');

  return (
    <label className={cn(
      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
      checked ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50"
    )}>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {trip.title || 'Untitled Trip'}
        </p>
        <p className="text-xs text-muted-foreground">{dateDisplay}</p>
        {subtext && (
          <p className={cn(
            "text-xs mt-0.5",
            subtextMuted ? "text-muted-foreground/60" : "text-primary/70"
          )}>
            {subtext}
          </p>
        )}
      </div>
    </label>
  );
}
