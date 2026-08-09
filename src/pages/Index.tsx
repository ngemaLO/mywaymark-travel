import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { AssistantHero } from '@/components/AssistantHero';
import { WorldMap } from '@/components/WorldMap';
import { OnThisDay } from '@/components/OnThisDay';
import { RecentJourneys } from '@/components/RecentJourneys';
import { TodayEntry } from '@/components/TodayEntry';
import { ArchiveLinks } from '@/components/ArchiveLinks';
import { LetterNotice } from '@/components/letters/LetterNotice';
import { ScrollReveal } from '@/components/ScrollReveal';
import { CountryPanel } from '@/components/CountryPanel';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useEnsureAnnualLetter } from '@/hooks/useLetters';
import { useConnectionVisitedCountries, useConnectionCurrentTrips } from '@/hooks/useFollows';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddTripModal } from '@/components/AddTripModal';
import { TripSummaryCard } from '@/components/ai/TripSummaryCard';
import { MilestoneModal } from '@/components/MilestoneModal';
import { useMilestones } from '@/hooks/useMilestones';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [addTripPreselect, setAddTripPreselect] = useState<string | undefined>();
  const [panelIso, setPanelIso] = useState<string | null>(null);
  const { checkAndGenerate } = useEnsureAnnualLetter();

  const handleLogVisitForCountry = (iso2: string) => {
    setAddTripPreselect(iso2);
    setAddTripOpen(true);
  };

  useEffect(() => {
    if (user) checkAndGenerate();
  }, [user, checkAndGenerate]);

  const hasVisits = visitedIsos.length > 0;
  const { currentMilestone, triggerFlag, dismiss: dismissMilestone } = useMilestones(visitedIsos);
  const { data: connectionVisitedIsos = [] } = useConnectionVisitedCountries();
  const { data: connectionCurrentTrips = [] } = useConnectionCurrentTrips();

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
              Start logging the places you've already been, and your map fills in below.
            </p>
            <div className="journal-action">
              <Button onClick={() => setAddTripOpen(true)} size="lg" className="gap-2 px-6">
                <Plus className="w-4 h-4" />
                Log your first visit
              </Button>
            </div>
          </article>

          {/* Show the globe even for new users — their unclaimed world */}
          <section className="globe-hero">
            <div className="globe-hero-inner">
              <WorldMap heroMode connectionVisitedIsos={connectionVisitedIsos} connectionCurrentTrips={connectionCurrentTrips} />
            </div>
          </section>
        </main>
      ) : (
        <>
          {/* Content sections — your travel history, secondary to the assistant above */}
          <main className="journal-page">
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

          {/* Globe — a smaller, secondary view of your travel history */}
          <section className="globe-hero globe-hero--secondary">
            <div className="globe-hero-inner">
              <WorldMap
                onCountryClick={(iso) => setPanelIso(iso)}
                connectionVisitedIsos={connectionVisitedIsos}
                connectionCurrentTrips={connectionCurrentTrips}
              />
            </div>
            <div className="globe-hero-stats">
              <ArchiveLinks />
            </div>
          </section>
        </>
      )}

      {/* Colophon */}
      <footer className="journal-colophon">
        <p>Waymark</p>
      </footer>

      <AddTripModal
        open={addTripOpen}
        onOpenChange={(open) => { setAddTripOpen(open); if (!open) setAddTripPreselect(undefined); }}
        preselectedCountry={addTripPreselect}
      />
      <CountryPanel
        iso2={panelIso}
        onClose={() => setPanelIso(null)}
        onLogVisit={handleLogVisitForCountry}
      />
      <MilestoneModal milestone={currentMilestone} triggerFlag={triggerFlag} onClose={dismissMilestone} />
      <BottomNav />
    </div>
  );
};

export default Index;
