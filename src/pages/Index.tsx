import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { StatsRow } from '@/components/StatsRow';
import { TravelContext } from '@/components/TravelContext';
import { OnThisDay } from '@/components/OnThisDay';
import { BadgeGrid } from '@/components/BadgeGrid';
import { TimelinePreview } from '@/components/TimelinePreview';
import { CurrentChapterCard } from '@/components/CurrentChapterCard';
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Your Travel Story
              </h1>
              <p className="text-sm text-muted-foreground">
                Your private travel ledger
              </p>
            </div>
            {user && hasVisits && (
              <DashboardScopeSelector value={dashboardScope} onChange={setDashboardScope} />
            )}
          </div>
        </section>

        {/* Empty State for new users */}
        {user && !isLoading && !hasVisits ? (
          <section className="py-20 text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-display font-semibold text-foreground">
                  Welcome to Waymark
                </h2>
                <p className="text-muted-foreground max-w-sm mx-auto text-sm">
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
          <>
            {/* World Map - Hero */}
            <section className="py-4">
              <WorldMap 
                onCountryClick={(iso) => navigate(`/country/${iso}`)} 
                scope={dashboardScope}
              />
            </section>

            {/* Stats - Single understated metric */}
            <section className="py-2">
              <StatsRow />
            </section>

            {/* Travel Context - Elegant single line */}
            <TravelContext />

            {/* On This Day - Reflective accent */}
            <OnThisDay />

            {/* Current Chapter */}
            <CurrentChapterCard />

            {/* Two Column Layout - Collection primary, Timeline secondary */}
            <div className="grid lg:grid-cols-3 gap-10 pt-4">
              {/* Country Collection - Primary feature */}
              <section className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-display font-semibold text-foreground">
                  Country Collection
                </h2>
                <BadgeGrid />
              </section>

              {/* Recent Trips - De-emphasized */}
              <section className="lg:col-span-1">
                <TimelinePreview scope={dashboardScope} />
              </section>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 mt-20">
        <div className="container text-center text-xs text-muted-foreground/60">
          <p>Waymark — Your private travel ledger</p>
        </div>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </div>
  );
};

export default Index;