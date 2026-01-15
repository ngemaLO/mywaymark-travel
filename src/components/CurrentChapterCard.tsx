import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useCurrentChapter, useChapters } from '@/hooks/useChapters';
import { getCountryByIso } from '@/data/countries';

export function CurrentChapterCard() {
  const { currentChapter, isLoading } = useCurrentChapter();
  const { data: allChapters = [] } = useChapters();

  if (isLoading) {
    return null;
  }

  // No chapters at all - show subtle prompt to create one
  if (allChapters.length === 0) {
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

  // Has chapters but none are "current" (today doesn't fall within any chapter's dates)
  if (!currentChapter) {
    const today = new Date().toISOString().split('T')[0];
    
    // Find the most relevant chapter: upcoming or most recent
    const sortedChapters = [...allChapters].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    
    const upcomingChapter = sortedChapters.find(c => c.start_date > today);
    const pastChapter = sortedChapters.find(c => c.end_date && c.end_date < today);
    const relevantChapter = upcomingChapter || pastChapter || sortedChapters[0];

    if (!relevantChapter) {
      return null;
    }

    const isUpcoming = relevantChapter.start_date > today;
    const label = isUpcoming ? 'Upcoming Chapter' : 'Most Recent Chapter';

    const homeCountry = relevantChapter.home_base_country_iso2 
      ? getCountryByIso(relevantChapter.home_base_country_iso2) 
      : null;

    const dateRange = relevantChapter.end_date
      ? `${format(new Date(relevantChapter.start_date), 'MMM yyyy')} – ${format(new Date(relevantChapter.end_date), 'MMM yyyy')}`
      : `Starting ${format(new Date(relevantChapter.start_date), 'MMMM yyyy')}`;

    return (
      <section className="journal-section">
        <p className="journal-chapter-label">{label}</p>
        <h2 className="journal-chapter-title">{relevantChapter.title}</h2>
        
        <p className="journal-chapter-meta">
          {dateRange}
          {homeCountry && <> · Based in {homeCountry.name}</>}
        </p>

        {relevantChapter.description && (
          <p className="journal-chapter-description">
            {relevantChapter.description}
          </p>
        )}

        <Link to="/chapters" className="journal-more">
          View all chapters →
        </Link>
      </section>
    );
  }

  // Has a current chapter - show it
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
