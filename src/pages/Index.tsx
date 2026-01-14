import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { OnThisDay } from '@/components/OnThisDay';
import { PlacesGrid } from '@/components/PlacesGrid';
import { RecentJourneys } from '@/components/RecentJourneys';
import { CurrentChapterCard } from '@/components/CurrentChapterCard';
import { CurrentTripCard } from '@/components/CurrentTripCard';
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

  const hasVisits = visitedIsos.length > 0;

  return (
    <div className="min-h-screen relative">
      {/* Subtle cartographic grid - fades before map */}
      <div className="grid-overlay" aria-hidden="true" />
      
      <Header />
      
      <main className="container relative z-10 pt-12 pb-8">
        {/* Hero Section - minimal */}
        <section className="text-center mb-8">
          <div className="space-y-2 max-w-lg mx-auto">
            <h1 className="text-2xl md:text-3xl font-display text-foreground">
              Your Travel Story
            </h1>
            <p className="text-sm text-muted-foreground/60">
              A private ledger of places you've been
            </p>
          </div>
        </section>

        {/* Empty State for new users */}
        {user && !isLoading && !hasVisits ? (
          <section className="py-24 text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-display text-foreground">
                  Welcome to Waymark
                </h2>
                <p className="max-w-sm mx-auto text-sm text-muted-foreground/60">
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
          <div className="space-y-8">
            {/* 1. Current State - The Present */}
            <CurrentTripCard />

            {/* 2. Recent Journeys - Reflective, 1-3 trips */}
            <section className="narrative-section">
              <div className="content-surface p-5">
                <h3 className="section-heading-narrative">Recent Journeys</h3>
                <RecentJourneys />
              </div>
            </section>

            {/* 3. Current Chapter - Life Context */}
            <CurrentChapterCard />

            {/* 4. Archive Section - Map + Places */}
            <section className="archive-section">
              <div className="archive-header">
                <h3 className="section-heading-archive">Your Archive</h3>
                <p className="text-xs text-muted-foreground/50">Places you've been</p>
              </div>
              
              {/* World Map */}
              <div className="py-4">
                <WorldMap 
                  onCountryClick={(iso) => navigate(`/country/${iso}`)} 
                />
              </div>

              {/* Places Grid */}
              <div className="archive-places">
                <PlacesGrid />
              </div>
            </section>

            {/* 5. Memory Moment - Quiet reflection at the end */}
            <OnThisDay />
          </div>
        )}
      </main>

      {/* Footer - barely there */}
      <footer className="border-t border-border/20 py-12 mt-16">
        <div className="container text-center text-xs text-muted-foreground/50">
          <p>Waymark</p>
        </div>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </div>
  );
};

export default Index;