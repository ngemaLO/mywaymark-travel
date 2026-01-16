import { format } from 'date-fns';
import { Calendar, MapPin, Edit2, Trash2, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Chapter } from '@/hooks/useChapters';
import { getCountryByIso } from '@/data/countries';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChapterCardProps {
  chapter: Chapter;
  onEdit: () => void;
  onDelete: () => void;
  onViewEntries: () => void;
}

export function ChapterCard({ chapter, onEdit, onDelete, onViewEntries }: ChapterCardProps) {
  const { user } = useAuth();
  
  // Get entries (visits) that overlap with this chapter's date range
  const { data: chapterEntries = [] } = useQuery({
    queryKey: ['chapter-entries-count', chapter.id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const chapterEnd = chapter.end_date || today;
      
      const { data, error } = await supabase
        .from('visits')
        .select('id, country_iso2')
        .eq('user_id', user.id)
        .lte('arrival_date', chapterEnd)
        .or(`departure_date.gte.${chapter.start_date},departure_date.is.null`);
      
      if (error) throw error;
      
      // Filter for entries that truly overlap
      return (data || []).filter(v => {
        // For ongoing visits (no departure), they overlap if arrival <= chapterEnd
        // For completed visits, check if departure >= chapterStart
        return true; // The query already handles the basic filtering
      });
    },
    enabled: !!user,
  });

  const entryCount = chapterEntries.length;
  const uniqueCountries = [...new Set(chapterEntries.map(e => e.country_iso2))];

  const homeCountry = chapter.home_base_country_iso2
    ? getCountryByIso(chapter.home_base_country_iso2)
    : null;

  const today = new Date().toISOString().split('T')[0];
  const isCurrent = chapter.start_date <= today && (!chapter.end_date || chapter.end_date >= today);

  const dateRange = chapter.end_date
    ? `${format(new Date(chapter.start_date), 'MMM yyyy')} – ${format(new Date(chapter.end_date), 'MMM yyyy')}`
    : `${format(new Date(chapter.start_date), 'MMM yyyy')} – Present`;

  return (
    <div className={cn(
      "card-elevated p-5 space-y-4 transition-all",
      isCurrent && "ring-2 ring-primary/30"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-lg text-foreground truncate">
              {chapter.title}
            </h3>
            {isCurrent && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                Current
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{dateRange}</span>
          </div>

          {homeCountry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Based in {homeCountry.name}</span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewEntries}>
              <Eye className="w-4 h-4 mr-2" />
              View Entries
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {chapter.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {chapter.description}
        </p>
      )}

      <div className="flex items-center gap-6 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold text-foreground">{entryCount}</span>
            <span className="text-muted-foreground"> entr{entryCount !== 1 ? 'ies' : 'y'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold text-foreground">{uniqueCountries.length}</span>
            <span className="text-muted-foreground"> countr{uniqueCountries.length !== 1 ? 'ies' : 'y'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
