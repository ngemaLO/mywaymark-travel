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

  // No chapters at all - show a gentle, reflective prompt
  if (allChapters.length === 0) {
    return (
      <section className="journal-chapter-opening">
        <p className="journal-chapter-whisper">
          Every journey has its seasons.{' '}
          <Link to="/travels" className="journal-chapter-whisper-link">
            Begin yours
          </Link>
        </p>
      </section>
    );
  }

  // Find the chapter to display - current, or most relevant
  let chapterToShow = currentChapter;
  let contextLine: string | null = null;

  if (!currentChapter) {
    const today = new Date().toISOString().split('T')[0];
    
    // Find the most relevant chapter
    const sortedChapters = [...allChapters].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    
    const upcomingChapter = sortedChapters.find(c => c.start_date > today);
    const pastChapter = sortedChapters.find(c => c.end_date && c.end_date < today);
    chapterToShow = upcomingChapter || pastChapter || sortedChapters[0];

    // Add a quiet transitional context
    if (upcomingChapter) {
      contextLine = `Beginning ${format(new Date(upcomingChapter.start_date), 'MMMM yyyy')}`;
    }
  }

  if (!chapterToShow) {
    return null;
  }

  const homeCountry = chapterToShow.home_base_country_iso2 
    ? getCountryByIso(chapterToShow.home_base_country_iso2) 
    : null;

  // Format the date context naturally
  const dateContext = chapterToShow.end_date
    ? `${format(new Date(chapterToShow.start_date), 'MMMM yyyy')} – ${format(new Date(chapterToShow.end_date), 'MMMM yyyy')}`
    : format(new Date(chapterToShow.start_date), 'MMMM yyyy');

  return (
    <section className="journal-chapter-opening">
      <h2 className="journal-chapter-heading">{chapterToShow.title}</h2>
      
      <p className="journal-chapter-context">
        {contextLine || dateContext}
        {homeCountry && ` · ${homeCountry.name}`}
      </p>

      {chapterToShow.description && (
        <p className="journal-chapter-epigraph">
          {chapterToShow.description}
        </p>
      )}

      <Link to="/travels" className="journal-chapter-nav">
        all chapters
      </Link>
    </section>
  );
}
