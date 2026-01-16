import { useLetter, useDeleteLetter } from '@/hooks/useLetters';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Trash2, FileDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const LetterReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: letter, isLoading } = useLetter(id);
  const deleteLetter = useDeleteLetter();

  const handleDelete = async () => {
    if (!letter) return;
    await deleteLetter.mutateAsync(letter.id);
    navigate('/letters');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen letter-reader-bg flex items-center justify-center">
        <p className="journal-body--muted">Loading...</p>
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen letter-reader-bg flex items-center justify-center">
        <div className="text-center">
          <p className="journal-body--muted">Letter not found.</p>
          <Button 
            variant="ghost" 
            className="mt-4 journal-link"
            onClick={() => navigate('/letters')}
          >
            Return to Letters
          </Button>
        </div>
      </div>
    );
  }

  const formatPeriod = () => {
    const start = new Date(letter.period_start);
    const end = new Date(letter.period_end);
    
    if (letter.scope === 'year') {
      return format(start, 'yyyy');
    }
    
    return `${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`;
  };

  return (
    <div className="min-h-screen letter-reader-bg">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="journal-link--tertiary"
          onClick={() => navigate('/letters')}
        >
          <X className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="journal-link--tertiary">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Letter content */}
      <main className="letter-reader-content">
        <article className="letter-article">
          {/* Period marker */}
          <p className="letter-period">{formatPeriod()}</p>

          {/* Title */}
          <h1 className="letter-title">{letter.title}</h1>

          {/* Subtitle */}
          {letter.subtitle && (
            <p className="letter-subtitle">{letter.subtitle}</p>
          )}

          {/* Body */}
          <div className="letter-body">
            {letter.body.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {/* Closing */}
          <footer className="letter-footer">
            <p>Saved in your journal.</p>
          </footer>
        </article>
      </main>
    </div>
  );
};

export default LetterReader;