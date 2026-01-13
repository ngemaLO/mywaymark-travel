import { Globe, BookOpen, ChevronDown } from 'lucide-react';
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
import { useMemo } from 'react';

export type DashboardScopeValue = 'all' | 'current' | string;

interface DashboardScopeSelectorProps {
  value: DashboardScopeValue;
  onChange: (value: DashboardScopeValue) => void;
}

export function DashboardScopeSelector({ value, onChange }: DashboardScopeSelectorProps) {
  const { data: chapters = [] } = useChapters();

  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => 
    c.start_date <= today && (!c.end_date || c.end_date >= today)
  );

  const selectedChapter = useMemo(() => {
    if (value === 'all' || value === 'current') return null;
    return chapters.find(c => c.id === value) || null;
  }, [value, chapters]);

  const getDisplayLabel = () => {
    if (value === 'all') return 'All Time';
    if (value === 'current') {
      return currentChapter ? currentChapter.title : 'Current Chapter';
    }
    return selectedChapter?.title || 'Select Chapter';
  };

  const getIcon = () => {
    if (value === 'all') return <Globe className="w-4 h-4" />;
    return <BookOpen className="w-4 h-4" />;
  };

  // Don't show if no chapters exist
  if (chapters.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          {getIcon()}
          <span className="truncate max-w-28 text-xs font-medium">{getDisplayLabel()}</span>
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onChange('all')}>
          <Globe className="w-4 h-4 mr-2" />
          All Time
        </DropdownMenuItem>
        
        {currentChapter && (
          <DropdownMenuItem onClick={() => onChange('current')}>
            <BookOpen className="w-4 h-4 mr-2" />
            <div className="flex-1 min-w-0">
              <span>Current Chapter</span>
              <span className="ml-2 text-xs text-muted-foreground truncate">
                {currentChapter.title}
              </span>
            </div>
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
