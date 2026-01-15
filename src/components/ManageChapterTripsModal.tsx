import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChapterTrips, useAddChapterTrips, useRemoveChapterTrip, type Chapter } from '@/hooks/useChapters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ManageChapterTripsModalProps {
  chapter: Chapter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Trip {
  id: string;
  title: string | null;
  start_date: string;
  end_date: string | null;
}

export function ManageChapterTripsModal({ chapter, open, onOpenChange }: ManageChapterTripsModalProps) {
  const { user } = useAuth();
  const { data: currentTrips = [], isLoading: loadingCurrent } = useChapterTrips(chapter?.id || null);
  const addChapterTrips = useAddChapterTrips();
  const removeChapterTrip = useRemoveChapterTrip();

  // Fetch all user trips
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
    enabled: !!user && open,
  });

  const currentTripIds = new Set(currentTrips.map(t => t.id));
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Sync selected trips with current trips when modal opens
  useEffect(() => {
    if (open && currentTrips.length > 0) {
      setSelectedTripIds(new Set(currentTrips.map(t => t.id)));
    } else if (open) {
      setSelectedTripIds(new Set());
    }
  }, [open, currentTrips]);

  const toggleTrip = (tripId: string) => {
    setSelectedTripIds(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!chapter) return;
    setIsSaving(true);

    try {
      // Find trips to add (selected but not currently linked)
      const tripsToAdd = Array.from(selectedTripIds).filter(id => !currentTripIds.has(id));
      
      // Find trips to remove (currently linked but not selected)
      const tripsToRemove = Array.from(currentTripIds).filter(id => !selectedTripIds.has(id));

      // Add new trips
      if (tripsToAdd.length > 0) {
        await addChapterTrips.mutateAsync({
          chapterId: chapter.id,
          tripIds: tripsToAdd,
          addedMethod: 'manual',
        });
      }

      // Remove unselected trips
      for (const tripId of tripsToRemove) {
        await removeChapterTrip.mutateAsync({
          chapterId: chapter.id,
          tripId,
        });
      }

      toast.success('Chapter trips updated');
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hooks
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingCurrent || loadingAll;
  const hasChanges = (() => {
    if (selectedTripIds.size !== currentTripIds.size) return true;
    for (const id of selectedTripIds) {
      if (!currentTripIds.has(id)) return true;
    }
    return false;
  })();

  // Check if trip overlaps with chapter dates
  const isOverlapping = (trip: Trip) => {
    if (!chapter) return false;
    const tripStart = trip.start_date;
    const tripEnd = trip.end_date || trip.start_date;
    const chapterStart = chapter.start_date;
    const chapterEnd = chapter.end_date;

    const tripStartsBeforeChapterEnds = !chapterEnd || tripStart <= chapterEnd;
    const tripEndsAfterChapterStarts = tripEnd >= chapterStart;
    return tripStartsBeforeChapterEnds && tripEndsAfterChapterStarts;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Manage Trips
          </DialogTitle>
          <DialogDescription>
            Select which trips belong to "{chapter?.title}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : allTrips.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No trips found. Add some trips first.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6 max-h-[400px]">
            <div className="space-y-2 py-2">
              {allTrips.map((trip) => {
                const isSelected = selectedTripIds.has(trip.id);
                const overlaps = isOverlapping(trip);
                const dateDisplay = trip.end_date
                  ? `${format(new Date(trip.start_date), 'MMM d, yyyy')} – ${format(new Date(trip.end_date), 'MMM d, yyyy')}`
                  : format(new Date(trip.start_date), 'MMM d, yyyy');

                return (
                  <label
                    key={trip.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTrip(trip.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {trip.title || 'Untitled Trip'}
                      </p>
                      <p className="text-xs text-muted-foreground">{dateDisplay}</p>
                      {overlaps && (
                        <p className="text-xs text-primary/70 mt-0.5">
                          Overlaps chapter dates
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedTripIds.size} trip{selectedTripIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
