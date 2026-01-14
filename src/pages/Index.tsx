import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { StatsRow } from '@/components/StatsRow';
import { TravelContext } from '@/components/TravelContext';
import { OnThisDay } from '@/components/OnThisDay';
import { BadgeGrid } from '@/components/BadgeGrid';
import { TimelinePreview } from '@/components/TimelinePreview';
import { CurrentChapterCard } from '@/components/CurrentChapterCard';
import { CurrentTripCard } from '@/components/CurrentTripCard';
import { DashboardScopeSelector, type DashboardScopeValue } from '@/components/DashboardScopeSelector';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { Button } from '@/components/ui/button';
import { Plus, MapPin } from 'lucide-react';
import { useState } from 'react';
import { AddTripModal } from '@/components/AddTripModal';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [dashboardScope, setDashboardScope] = useState<DashboardScopeValue>('all');

  const hasVisits = visitedIsos.length > 0;

  return (
    <div className="min-h-screen relative">
      {/* Subtle cartographic grid - fades before map */}
      <div className="grid-overlay" aria-hidden="true" />
      
      <Header />
      
      <main className="container relative z-10 pt-12 pb-8">
        {/* Hero Section - generous whitespace */}
        <section className="text-center mb-8">
          <div className="space-y-2 max-w-lg mx-auto">
            <h1 className="text-2xl md:text-3xl font-display text-foreground">
              Your Travel Story
            </h1>
            <p className="text-sm text-muted-foreground/70">
              A private ledger of places you've been
            </p>
          </div>
          
          {user && hasVisits && (
            <div className="mt-6">
              <DashboardScopeSelector value={dashboardScope} onChange={setDashboardScope} />
            </div>
          )}
        </section>

        {/* Empty State for new users */}
        {user && !isLoading && !hasVisits ? (
          <section className="py-24 text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-display text-foreground">
                  Welcome to Waymark
                </h2>
                <p className="text-muted-foreground/70 max-w-sm mx-auto text-sm">
                  Start building your travel story by adding your first trip. Nothing is tracked automatically — you're always in control.
                </p>
              </div>
            </div>
            
            <Button onClick={() => setAddTripOpen(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Add Your First Trip
            </Button>
          </section>
        ) : (
          <div className="space-y-16">
            {/* World Map - The Hero */}
            <section className="py-6">
              <WorldMap 
                onCountryClick={(iso) => navigate(`/country/${iso}`)} 
                scope={dashboardScope}
              />
            </section>

            {/* Stats - Understated, centered */}
            <section>
              <StatsRow />
            </section>

            {/* Current Trip - Contextual presence */}
            <CurrentTripCard />

            {/* Memory moments - subtle accent */}
            <OnThisDay />

            {/* Travel Context - elegant single line */}
            <TravelContext />

            {/* Current Chapter - softened */}
            <CurrentChapterCard />

            {/* Collections - lower on page */}
            <div className="grid lg:grid-cols-3 gap-12 pt-8">
              {/* Visited Countries */}
              <section className="lg:col-span-2 content-surface p-6 space-y-5">
                <h2 className="section-heading">
                  Visited Countries
                </h2>
                <BadgeGrid />
              </section>

              {/* Recent Trips - de-emphasized */}
              <section className="lg:col-span-1">
                <TimelinePreview scope={dashboardScope} />
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer - barely there */}
      <footer className="border-t border-border/20 py-12 mt-24">
        <div className="container text-center text-xs text-muted-foreground/40">
          <p>Waymark</p>
        </div>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </div>
  );
};

export default Index;
