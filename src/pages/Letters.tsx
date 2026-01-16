import { Header } from '@/components/Header';
import { useLetters, useDeleteLetter } from '@/hooks/useLetters';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CreateLetterModal } from '@/components/letters/CreateLetterModal';
import { useState } from 'react';

const Letters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: letters = [], isLoading } = useLetters();
  const deleteLetter = useDeleteLetter();
  const [createOpen, setCreateOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="journal-page">
          <article className="journal-entry journal-entry--welcome">
            <p className="journal-date">Letters</p>
            <h1 className="journal-title">Your Waymark Letters</h1>
            <p className="journal-body">
              Sign in to view your letters.
            </p>
          </article>
        </main>
      </div>
    );
  }

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'year': return 'Annual';
      case 'chapter': return 'Chapter';
      case 'custom': return 'Custom';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="journal-page">
        <section className="journal-section">
          <header className="journal-section-header">
            <div>
              <h1 className="journal-section-title">Your Letters</h1>
              <p className="journal-section-subtitle">Reflections from your travels</p>
            </div>
            <Button 
              variant="ghost" 
              className="journal-link"
              onClick={() => setCreateOpen(true)}
            >
              Write a Letter
            </Button>
          </header>

          {isLoading ? (
            <div className="py-12 text-center">
              <p className="journal-body--muted">Loading...</p>
            </div>
          ) : letters.length === 0 ? (
            <div className="py-16 text-center">
              <p className="journal-body journal-body--muted">
                Your first Waymark Letter will appear once you've logged a few entries.
              </p>
            </div>
          ) : (
            <div className="journal-list">
              {letters.map((letter) => (
                <div 
                  key={letter.id}
                  className="journal-list-item group cursor-pointer"
                  onClick={() => navigate(`/letters/${letter.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="journal-list-place block truncate">{letter.title}</span>
                    <span className="journal-list-date">{getScopeLabel(letter.scope)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="journal-list-date">
                      {format(new Date(letter.generated_at), 'MMM d, yyyy')}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLetter.mutate(letter.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="journal-colophon">
        <p>Waymark</p>
      </footer>

      <CreateLetterModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default Letters;