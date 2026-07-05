import { useLatestLetter } from '@/hooks/useLetters';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getPeriodLabel(scope: string, periodStart: string): string {
  const year = new Date(periodStart).getFullYear();
  if (scope === 'year') return `Your ${year} in travel`;
  if (scope === 'chapter') return `A chapter of your travels`;
  if (scope === 'trip') return `A trip reflection`;
  return `Your travels, ${year}`;
}

export function LetterNotice() {
  const { user } = useAuth();
  const { letter, isLoading } = useLatestLetter();
  const navigate = useNavigate();

  if (!user || isLoading || !letter) return null;

  const generatedAt = new Date(letter.generated_at);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (generatedAt < thirtyDaysAgo) return null;

  const periodLabel = getPeriodLabel(letter.scope, letter.period_start);

  return (
    <div className="letter-notice-card" onClick={() => navigate(`/letters/${letter.id}`)}>
      <div className="letter-notice-shimmer" aria-hidden="true" />

      <div className="letter-notice-inner">
        <div className="letter-notice-badge">
          <Sparkles className="w-3.5 h-3.5" />
          New reflection
        </div>

        <h2 className="letter-notice-title">{letter.title}</h2>

        {letter.subtitle && (
          <p className="letter-notice-subtitle">{letter.subtitle}</p>
        )}

        <div className="letter-notice-footer">
          <span className="letter-notice-period">{periodLabel}</span>
          <Button
            size="sm"
            className="letter-notice-cta"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/letters/${letter.id}`);
            }}
          >
            Read
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
