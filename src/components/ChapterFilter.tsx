import { BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChapters, type Chapter } from '@/hooks/useChapters';
import { format } from 'date-fns';

export type ChapterFilterValue = 'all' | 'current' | string;

interface ChapterFilterProps {
  value: ChapterFilterValue;
  onChange: (value: ChapterFilterValue) => void;
}

export function ChapterFilter({ value, onChange }: ChapterFilterProps) {
  const { data: chapters = [] } = useChapters();

  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => 
    c.start_date <= today && (!c.end_date || c.end_date >= today)
  );

  const getDisplayLabel = () => {
    if (value === 'all') return 'All Time';
    if (value === 'current') {
      return currentChapter ? currentChapter.title : 'Current Chapter';
    }
    const chapter = chapters.find(c => c.id === value);
    return chapter?.title || 'Select Chapter';
  };

  if (chapters.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="chapter-filter-trigger">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="truncate max-w-28">{getDisplayLabel()}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onChange('all')}>
          All Time
        </DropdownMenuItem>
        
        {currentChapter && (
          <DropdownMenuItem onClick={() => onChange('current')}>
            Current Chapter
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
                onClick={() => onChange(chapter.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate">{chapter.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(chapter.start_date), 'MMM yyyy')}
                    {chapter.end_date 
                      ? ` - ${format(new Date(chapter.end_date), 'MMM yyyy')}`
                      : ' - Present'
                    }
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
