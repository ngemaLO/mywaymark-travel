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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type Chapter } from '@/hooks/useChapters';
import { getCountryByIso } from '@/data/countries';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChapterEntriesModalProps {
  chapter: Chapter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Entry {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
}

export function ChapterEntriesModal({ chapter, open, onOpenChange }: ChapterEntriesModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all user entries (visits) - these ARE the entries
  const { data: allEntries = [], isLoading: loadingAll } = useQuery({
    queryKey: ['all-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, country_iso2, arrival_date, departure_date')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false });
      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!user && open,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select entries that overlap with chapter dates when modal opens
  useEffect(() => {
    if (open && allEntries.length > 0 && chapter) {
      const overlappingIds = allEntries
        .filter(entry => isOverlapping(entry))
        .map(entry => entry.id);
      setSelectedIds(new Set(overlappingIds));
    }
  }, [open, allEntries, chapter]);

  const toggleEntry = (entryId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  // Check if entry overlaps with chapter dates
  const isOverlapping = (entry: Entry) => {
    if (!chapter) return false;
    const entryStart = entry.arrival_date;
    const entryEnd = entry.departure_date || entry.arrival_date;
    const chapterStart = chapter.start_date;
    const chapterEnd = chapter.end_date;

    const startsBeforeChapterEnds = !chapterEnd || entryStart <= chapterEnd;
    const endsAfterChapterStarts = entryEnd >= chapterStart;
    return startsBeforeChapterEnds && endsAfterChapterStarts;
  };

  // For now, this modal is informational - showing which entries fall within this chapter
  // The chapter system will be simplified to just show entries within the date range
  const handleDone = () => {
    onOpenChange(false);
  };

  const isLoading = loadingAll;
  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            During this time
          </DialogTitle>
          <DialogDescription>
            Entries from "{chapter?.title}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : allEntries.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No entries yet. Add some entries first.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6 max-h-[400px]">
            <div className="space-y-2 py-2">
              {allEntries.map((entry) => {
                const overlaps = isOverlapping(entry);
                const country = getCountryByIso(entry.country_iso2);
                const dateDisplay = entry.departure_date
                  ? `${format(new Date(entry.arrival_date), 'MMM d, yyyy')} – ${format(new Date(entry.departure_date), 'MMM d, yyyy')}`
                  : format(new Date(entry.arrival_date), 'MMM d, yyyy');

                if (!overlaps) return null; // Only show entries during this chapter

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {country?.name || entry.country_iso2}
                      </p>
                      <p className="text-xs text-muted-foreground">{dateDisplay}</p>
                    </div>
                  </div>
                );
              })}
              
              {allEntries.filter(isOverlapping).length === 0 && (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No entries during this time.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {allEntries.filter(isOverlapping).length} entr{allEntries.filter(isOverlapping).length !== 1 ? 'ies' : 'y'} during this chapter
            </p>
            <Button onClick={handleDone}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
