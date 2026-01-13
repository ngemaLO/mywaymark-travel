import { Globe, BookOpen, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChapters, type Chapter } from '@/hooks/useChapters';
import { CreateChapterModal } from '@/components/CreateChapterModal';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';

export type DashboardScopeValue = 'all' | 'current' | string;

interface DashboardScopeSelectorProps {
  value: DashboardScopeValue;
  onChange: (value: DashboardScopeValue) => void;
}

export function DashboardScopeSelector({ value, onChange }: DashboardScopeSelectorProps) {
  const { data: chapters = [] } = useChapters();
  const [createChapterOpen, setCreateChapterOpen] = useState(false);

  const hasChapters = chapters.length > 0;

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

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8">
            {getIcon()}
            <span className="truncate max-w-28 text-xs font-medium">{getDisplayLabel()}</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => onChange('all')}>
            <Globe className="w-4 h-4 mr-2" />
            All Time
          </DropdownMenuItem>
          
          {hasChapters ? (
            <>
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
          ) : (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-3 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="w-4 h-4 opacity-50" />
                  <span className="text-sm opacity-50">Chapter</span>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">No chapters yet</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a chapter to filter your map and timeline.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full gap-1.5 h-7 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCreateChapterOpen(true);
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Create Chapter
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {!hasChapters && (
        <Button 
          size="sm" 
          variant="ghost" 
          className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setCreateChapterOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create Chapter</span>
        </Button>
      )}

      <CreateChapterModal 
        open={createChapterOpen} 
        onOpenChange={setCreateChapterOpen} 
      />
    </div>
  );
}
