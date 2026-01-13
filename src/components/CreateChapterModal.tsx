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
import { useCreateChapter, useChapters, FREE_CHAPTER_LIMIT } from '@/hooks/useChapters';
import { SuggestTripsStep } from '@/components/SuggestTripsStep';
import type { Chapter } from '@/hooks/useChapters';

interface CreateChapterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'details' | 'suggest-trips';

export function CreateChapterModal({ open, onOpenChange }: CreateChapterModalProps) {
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(false);
  const [homeBase, setHomeBase] = useState('');
  const [description, setDescription] = useState('');
  const [createdChapter, setCreatedChapter] = useState<Chapter | null>(null);

  const createChapter = useCreateChapter();
  const { data: chapters = [] } = useChapters();

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

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep('details');
      setTitle('');
      setStartDate('');
      setEndDate('');
      setIsOngoing(false);
      setHomeBase('');
      setDescription('');
      setCreatedChapter(null);
    }
  }, [open]);

  const handleCreateChapter = async () => {
    const chapter = await createChapter.mutateAsync({
      title,
      start_date: startDate,
      end_date: isOngoing ? null : endDate || null,
      home_base_country_iso2: homeBase || null,
      description: description || null,
    });
    setCreatedChapter(chapter);
    setStep('suggest-trips');
  };

  const handleComplete = () => {
    onOpenChange(false);
  };

  const isAtFreeLimit = chapters.length >= FREE_CHAPTER_LIMIT;
  const isValid = title.trim() && startDate;

  if (step === 'suggest-trips' && createdChapter) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Add Trips to "{createdChapter.title}"
            </DialogTitle>
            <DialogDescription>
              Select trips to include in this chapter. Suggested trips overlap with your chapter dates.
            </DialogDescription>
          </DialogHeader>

          <SuggestTripsStep chapter={createdChapter} onComplete={handleComplete} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Create a Chapter
          </DialogTitle>
          <DialogDescription>
            Chapters help you organize your travels into meaningful life periods.
          </DialogDescription>
        </DialogHeader>

        {isAtFreeLimit ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Chapter Limit Reached</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Free accounts can create up to {FREE_CHAPTER_LIMIT} chapters. 
                Upgrade to Pro for unlimited chapters and more features.
              </p>
            </div>
            <Button variant="default" className="mt-4">
              Upgrade to Pro
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="chapter-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="chapter-title"
                  placeholder="e.g., College Years, European Adventure, Post-Grad Life..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start-date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="end-date">End Date</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ongoing"
                      checked={isOngoing}
                      onCheckedChange={(checked) => {
                        setIsOngoing(checked === true);
                        if (checked) setEndDate('');
                      }}
                    />
                    <Label htmlFor="ongoing" className="text-sm text-muted-foreground cursor-pointer">
                      Ongoing
                    </Label>
                  </div>
                </div>
                <Input
                  id="end-date"
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
                <Label htmlFor="home-base">Home Base (optional)</Label>
                <Select value={homeBase} onValueChange={setHomeBase}>
                  <SelectTrigger id="home-base">
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
                <p className="text-xs text-muted-foreground">
                  The country you called home during this chapter.
                </p>
              </div>

              {/* Description (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
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
        )}

        {!isAtFreeLimit && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChapter}
              disabled={!isValid || createChapter.isPending}
            >
              {createChapter.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Chapter
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
