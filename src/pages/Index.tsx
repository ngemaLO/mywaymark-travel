import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
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
import { Plus, MapPin, Compass, BarChart2 } from 'lucide-react';
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
      
      {/* Empty State for new users */}
      {user && !isLoading && !hasVisits ? (
        <>
          {/* Show the globe even for new users — their unclaimed world */}
          <section className="globe-hero">
            <div className="globe-hero-inner">
              <WorldMap heroMode connectionVisitedIsos={connectionVisitedIsos} connectionCurrentTrips={connectionCurrentTrips} />
            </div>
          </section>

          <main className="journal-page">
            <article className="journal-entry journal-entry--welcome">
              <p className="journal-date">Welcome to Waymark</p>
              <h1 className="journal-title">Your world is waiting</h1>
              <p className="journal-body">
                Every country on that globe is yours to claim. Start logging your travels
                and watch your world come to life.
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6 text-left">
                {[
                  {
                    icon: MapPin,
                    title: 'Track',
                    desc: 'Pin every country and city you visit on your personal map.',
                  },
                  {
                    icon: Compass,
                    title: 'Plan',
                    desc: 'Get AI-powered day-by-day itineraries tailored to your travel style.',
                  },
                  {
                    icon: BarChart2,
                    title: 'Discover',
                    desc: 'Explore stats, streaks, and insights from your travel history.',
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 space-y-2"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="journal-action">
                <Button onClick={() => setAddTripOpen(true)} size="lg" className="gap-2 px-6">
                  <Plus className="w-4 h-4" />
                  Log your first visit
                </Button>
              </div>
            </article>
          </main>
        </>
      ) : (
        <>
          {/* Hero Globe Section — Full width, immersive */}
          <section className="globe-hero">
            <div className="globe-hero-inner">
              <WorldMap
                onCountryClick={(iso) => setPanelIso(iso)}
                heroMode
                connectionVisitedIsos={connectionVisitedIsos}
                connectionCurrentTrips={connectionCurrentTrips}
              />
            </div>

            {/* Archive stats overlaid below globe */}
            <div className="globe-hero-stats">
              <ArchiveLinks />
            </div>
          </section>

          {/* Content sections below the globe */}
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
