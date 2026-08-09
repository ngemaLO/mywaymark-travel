import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { AssistantHero } from '@/components/AssistantHero';
import { OnThisDay } from '@/components/OnThisDay';
import { RecentJourneys } from '@/components/RecentJourneys';
import { TodayEntry } from '@/components/TodayEntry';
import { LetterNotice } from '@/components/letters/LetterNotice';
import { ScrollReveal } from '@/components/ScrollReveal';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useEnsureAnnualLetter } from '@/hooks/useLetters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddTripModal } from '@/components/AddTripModal';
import { TripSummaryCard } from '@/components/ai/TripSummaryCard';
import { MilestoneModal } from '@/components/MilestoneModal';
import { useMilestones } from '@/hooks/useMilestones';

const Index = () => {
  const { user } = useAuth();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const { checkAndGenerate } = useEnsureAnnualLetter();

  useEffect(() => {
    if (user) checkAndGenerate();
  }, [user, checkAndGenerate]);

  const hasVisits = visitedIsos.length > 0;
  const { currentMilestone, triggerFlag, dismiss: dismissMilestone } = useMilestones(visitedIsos);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <AssistantHero showPitch={!hasVisits} />

      {/* Empty State for new users — AssistantHero above already explains the product,
          so this stays short: just a nudge toward logging a first visit. */}
      {user && !isLoading && !hasVisits ? (
        <main className="journal-page">
          <article className="journal-entry journal-entry--welcome">
            <p className="journal-date">Get started</p>
            <h1 className="journal-title">Your world is waiting</h1>
            <p className="journal-body">
              Start logging the places you've already been, and your map fills in on the Map tab.
            </p>
            <div className="journal-action">
              <Button onClick={() => setAddTripOpen(true)} size="lg" className="gap-2 px-6">
                <Plus className="w-4 h-4" />
                Log your first visit
              </Button>
            </div>
          </article>
        </main>
      ) : (
        <main className="journal-page">
          {/* Content sections — your travel history, secondary to the assistant above */}
          {/* 1. Today — Present moment */}
          <ScrollReveal>
            <TodayEntry onAddTrip={() => setAddTripOpen(true)} />
          </ScrollReveal>

          {/* 2. Memory */}
          <ScrollReveal delay={50}>
            <OnThisDay />
          </ScrollReveal>

          {/* 3. Recent visits */}
          <ScrollReveal delay={100}>
            <RecentJourneys />
          </ScrollReveal>

          {/* 4. AI summary */}
          <ScrollReveal delay={150}>
            <TripSummaryCard />
          </ScrollReveal>

          {/* 5. Reflection notice */}
          <ScrollReveal delay={50}>
            <LetterNotice />
          </ScrollReveal>
        </main>
      )}

      {/* Colophon */}
      <footer className="journal-colophon">
        <p>Waymark</p>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
      <MilestoneModal milestone={currentMilestone} triggerFlag={triggerFlag} onClose={dismissMilestone} />
      <BottomNav />
    </div>
  );
};

export default Index;
