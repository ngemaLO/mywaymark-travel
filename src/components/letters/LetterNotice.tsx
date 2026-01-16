import { useLatestLetter } from '@/hooks/useLetters';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function LetterNotice() {
  const { user } = useAuth();
  const { letter, isLoading } = useLatestLetter();
  const navigate = useNavigate();

  // Don't show if not logged in, loading, or no letters
  if (!user || isLoading || !letter) return null;

  // Only show for letters generated in the last 30 days
  const generatedAt = new Date(letter.generated_at);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  if (generatedAt < thirtyDaysAgo) return null;

  return (
    <div className="journal-section journal-section--prompt">
      <p className="journal-prompt-text">
        <button
          onClick={() => navigate(`/letters/${letter.id}`)}
          className="journal-chapter-whisper-link"
        >
          A Waymark Letter is ready.
        </button>
      </p>
    </div>
  );
}