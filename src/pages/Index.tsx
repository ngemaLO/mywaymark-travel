import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { WorldMap } from '@/components/WorldMap';
import { OnThisDay } from '@/components/OnThisDay';
import { RecentJourneys } from '@/components/RecentJourneys';
import { CurrentChapterCard } from '@/components/CurrentChapterCard';
import { TodayEntry } from '@/components/TodayEntry';
import { ArchiveLinks } from '@/components/ArchiveLinks';
import { LetterNotice } from '@/components/letters/LetterNotice';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useEnsureAnnualLetter } from '@/hooks/useLetters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddTripModal } from '@/components/AddTripModal';
import { ChapterFilter } from '@/components/ChapterFilter';
import { TripSummaryCard } from '@/components/ai/TripSummaryCard';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [mapScope, setMapScope] = useState<string>('all');
  const { checkAndGenerate } = useEnsureAnnualLetter();

  useEffect(() => {
    if (user) checkAndGenerate();
  }, [user, checkAndGenerate]);

  const hasVisits = visitedIsos.length > 0;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      
      {/* Empty State for new users */}
      {user && !isLoading && !hasVisits ? (
        <main className="journal-page">
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
        </main>
      ) : (
        <>
          {/* Hero Globe Section — Full width, immersive */}
          <section className="globe-hero">
            <div className="globe-hero-inner">
              <WorldMap 
                onCountryClick={(iso) => navigate(`/country/${iso}`)}
                scope={mapScope}
                heroMode
              />
            </div>
            
            {/* Archive stats overlaid below globe */}
            <div className="globe-hero-stats">
              <ArchiveLinks />
              <div className="mt-2">
                <ChapterFilter value={mapScope} onChange={setMapScope} />
              </div>
            </div>
          </section>

          {/* Content sections below the globe */}
          <main className="journal-page">
            {/* 1. Today — Present moment */}
            <ScrollReveal>
              <TodayEntry onAddTrip={() => setAddTripOpen(true)} />
            </ScrollReveal>

            {/* 2. Recent entries */}
            <ScrollReveal delay={50}>
              <TripSummaryCard />
            </ScrollReveal>

            {/* 2. Recent entries */}
            <ScrollReveal delay={100}>
              <RecentJourneys />
            </ScrollReveal>

            {/* 2.5. Letter Notice */}
            <ScrollReveal delay={50}>
              <LetterNotice />
            </ScrollReveal>

            {/* 3. Chapter */}
            <ScrollReveal delay={100}>
              <CurrentChapterCard />
            </ScrollReveal>

            {/* 4. Memory */}
            <ScrollReveal delay={150}>
              <OnThisDay />
            </ScrollReveal>
          </main>
        </>
      )}

      {/* Colophon */}
      <footer className="journal-colophon">
        <p>Waymark</p>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
      <BottomNav />
    </div>
  );
};

export default Index;
