import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useCurrentChapter } from '@/hooks/useChapters';
import { getCountryByIso } from '@/data/countries';

export function CurrentChapterCard() {
  const { currentChapter, isLoading } = useCurrentChapter();

  if (isLoading) {
    return null;
  }

  // No chapter - show subtle prompt
  if (!currentChapter) {
    return (
      <section className="journal-section journal-section--prompt">
        <p className="journal-prompt-text">
          Chapters help organize your travels by life phases.{' '}
          <Link to="/chapters" className="journal-link">
            Start one
          </Link>
        </p>
      </section>
    );
  }

  const homeCountry = currentChapter.home_base_country_iso2 
    ? getCountryByIso(currentChapter.home_base_country_iso2) 
    : null;

  const dateRange = currentChapter.end_date
    ? `${format(new Date(currentChapter.start_date), 'MMM yyyy')} – ${format(new Date(currentChapter.end_date), 'MMM yyyy')}`
    : `Since ${format(new Date(currentChapter.start_date), 'MMMM yyyy')}`;

  return (
    <section className="journal-section">
      <p className="journal-chapter-label">Current Chapter</p>
      <h2 className="journal-chapter-title">{currentChapter.title}</h2>
      
      <p className="journal-chapter-meta">
        {dateRange}
        {homeCountry && <> · Based in {homeCountry.name}</>}
      </p>

      {currentChapter.description && (
        <p className="journal-chapter-description">
          {currentChapter.description}
        </p>
      )}

      <Link to="/chapters" className="journal-more">
        View all chapters →
      </Link>
    </section>
  );
}
