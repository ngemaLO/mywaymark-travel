import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { OnThisDay } from '@/components/OnThisDay';
import { RecentJourneys } from '@/components/RecentJourneys';
import { CurrentChapterCard } from '@/components/CurrentChapterCard';
import { TodayEntry } from '@/components/TodayEntry';
import { ArchiveLinks } from '@/components/ArchiveLinks';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AddTripModal } from '@/components/AddTripModal';
import { ChapterFilter } from '@/components/ChapterFilter';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [mapScope, setMapScope] = useState<string>('all');

  const hasVisits = visitedIsos.length > 0;

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="journal-page">
        {/* Empty State for new users */}
        {user && !isLoading && !hasVisits ? (
          <article className="journal-entry journal-entry--welcome">
            <p className="journal-date">Welcome</p>
            <h1 className="journal-title">Your journey begins here</h1>
            <p className="journal-body">
              Waymark is your personal travel journal. Nothing is tracked automatically — 
              you choose what to remember.
            </p>
            <div className="journal-action">
              <Button onClick={() => setAddTripOpen(true)} variant="ghost" className="journal-link">
                <Plus className="w-4 h-4" />
                Add your first entry
              </Button>
            </div>
          </article>
        ) : (
          <>
            {/* 1. Today — Present moment, like opening your journal */}
            <TodayEntry onAddTrip={() => setAddTripOpen(true)} />

            {/* 2. Recent — Last few entries, reflective */}
            <RecentJourneys />

            {/* 3. Chapter — Current life context */}
            <CurrentChapterCard />

            {/* 4. Archive — The accumulated history */}
            <section className="journal-section journal-section--archive">
              <header className="journal-section-header">
                <div>
                  <h2 className="journal-section-title">Your Archive</h2>
                  <p className="journal-section-subtitle">Every place tells a story</p>
                </div>
                <ChapterFilter value={mapScope} onChange={setMapScope} />
              </header>
              
              <div className="journal-map">
                <WorldMap 
                  onCountryClick={(iso) => navigate(`/country/${iso}`)}
                  scope={mapScope}
                />
              </div>

              <ArchiveLinks />
            </section>

            {/* 5. Memory — A quiet reflection at the end */}
            <OnThisDay />
          </>
        )}
      </main>

      {/* Colophon */}
      <footer className="journal-colophon">
        <p>Waymark</p>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </div>
  );
};

export default Index;
