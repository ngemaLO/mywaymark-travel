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

  // Fetch entries currently in this chapter
  const { data: currentEntryIds = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ['chapter-entries', chapter?.id, user?.id],
    queryFn: async () => {
      if (!user || !chapter) return [];
      const { data, error } = await supabase
        .from('chapter_visits')
        .select('visit_id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapter.id);
      if (error) {
        // Table might not exist yet, return empty
        if (error.code === '42P01') return [];
        throw error;
      }
      return data.map(d => d.visit_id);
    },
    enabled: !!user && !!chapter && open,
  });

  // Fetch all user entries (visits)
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

  const currentSet = new Set(currentEntryIds);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Sync selected entries with current entries when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(currentEntryIds));
    }
  }, [open, currentEntryIds]);

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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!chapter || !user) return;

      // Find entries to add (selected but not currently linked)
      const toAdd = Array.from(selectedIds).filter(id => !currentSet.has(id));
      
      // Find entries to remove (currently linked but not selected)
      const toRemove = Array.from(currentSet).filter(id => !selectedIds.has(id));

      // Add new entries
      if (toAdd.length > 0) {
        const inserts = toAdd.map(visitId => ({
          user_id: user.id,
          chapter_id: chapter.id,
          visit_id: visitId,
        }));
        const { error } = await supabase.from('chapter_visits').insert(inserts);
        if (error) throw error;
      }

      // Remove unselected entries
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('chapter_visits')
          .delete()
          .eq('chapter_id', chapter.id)
          .eq('user_id', user.id)
          .in('visit_id', toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-entries'] });
      queryClient.invalidateQueries({ queryKey: ['chapter-countries'] });
      toast.success('Chapter updated');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update chapter');
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingCurrent || loadingAll;
  const hasChanges = (() => {
    if (selectedIds.size !== currentSet.size) return true;
    for (const id of selectedIds) {
      if (!currentSet.has(id)) return true;
    }
    return false;
  })();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Entries in this chapter
          </DialogTitle>
          <DialogDescription>
            Select which entries are part of "{chapter?.title}"
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
                const isSelected = selectedIds.has(entry.id);
                const overlaps = isOverlapping(entry);
                const country = getCountryByIso(entry.country_iso2);
                const dateDisplay = entry.departure_date
                  ? `${format(new Date(entry.arrival_date), 'MMM d, yyyy')} – ${format(new Date(entry.departure_date), 'MMM d, yyyy')}`
                  : format(new Date(entry.arrival_date), 'MMM d, yyyy');

                return (
                  <label
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleEntry(entry.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {country?.name || entry.country_iso2}
                      </p>
                      <p className="text-xs text-muted-foreground">{dateDisplay}</p>
                      {overlaps && (
                        <p className="text-xs text-primary/70 mt-0.5">
                          During this chapter
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
              {selectedIds.size} entr{selectedIds.size !== 1 ? 'ies' : 'y'} selected
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
