import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateChapter, type Chapter } from '@/hooks/useChapters';

interface EditChapterModalProps {
  chapter: Chapter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChapterModal({ chapter, open, onOpenChange }: EditChapterModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(false);
  const [homeBase, setHomeBase] = useState('');
  const [description, setDescription] = useState('');

  const updateChapter = useUpdateChapter();

  // Fetch countries for home base selection
  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Populate form when chapter changes
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setStartDate(chapter.start_date);
      setEndDate(chapter.end_date || '');
      setIsOngoing(!chapter.end_date);
      setHomeBase(chapter.home_base_country_iso2 || '');
      setDescription(chapter.description || '');
    }
  }, [chapter]);

  const handleSave = async () => {
    if (!chapter) return;

    await updateChapter.mutateAsync({
      id: chapter.id,
      title,
      start_date: startDate,
      end_date: isOngoing ? null : endDate || null,
      home_base_country_iso2: homeBase || null,
      description: description || null,
    });

    onOpenChange(false);
  };

  const isValid = title.trim() && startDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Edit Chapter
          </DialogTitle>
          <DialogDescription>
            Update your chapter details.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-chapter-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-chapter-title"
                placeholder="e.g., College Years, European Adventure..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-end-date">End Date</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-ongoing"
                    checked={isOngoing}
                    onCheckedChange={(checked) => {
                      setIsOngoing(checked === true);
                      if (checked) setEndDate('');
                    }}
                  />
                  <Label htmlFor="edit-ongoing" className="text-sm text-muted-foreground cursor-pointer">
                    Ongoing
                  </Label>
                </div>
              </div>
              <Input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isOngoing}
                min={startDate}
                className={isOngoing ? 'opacity-50' : ''}
              />
            </div>

            {/* Home Base (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="edit-home-base">Home Base (optional)</Label>
              <Select value={homeBase} onValueChange={setHomeBase}>
                <SelectTrigger id="edit-home-base">
                  <SelectValue placeholder="Select a country..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    <SelectItem value="">None</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country.iso2} value={country.iso2}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="A brief summary of this life chapter..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={240}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/240
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || updateChapter.isPending}
          >
            {updateChapter.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
