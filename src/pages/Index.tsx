import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { OnThisDay } from '@/components/OnThisDay';
import { RecentJourneys } from '@/components/RecentJourneys';
import { CurrentChapterCard } from '@/components/CurrentChapterCard';
import { CurrentTripCard } from '@/components/CurrentTripCard';
import { ArchiveEntryPoints } from '@/components/ArchiveEntryPoints';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { Button } from '@/components/ui/button';
import { Plus, MapPin } from 'lucide-react';
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
    <div className="min-h-screen relative">
      {/* Subtle cartographic grid - fades before map */}
      <div className="grid-overlay" aria-hidden="true" />
      
      <Header />
      
      <main className="container relative z-10 pt-8 pb-8">
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
          <div className="dashboard-flow">
            {/* 1. Current Status - Primary hero card */}
            <CurrentTripCard />

            {/* 2. Recent Journeys - Timeline-style, reflective */}
            <RecentJourneys />

            {/* 3. Memory Moment - Emotionally framed */}
            <OnThisDay />

            {/* 4. Travel Archive Map - Hero archival artifact */}
            <section className="archive-map-section">
              <div className="archive-map-header">
                <div className="archive-map-title">
                  <h3 className="section-heading-archive">Your Archive</h3>
                  <p className="archive-subtitle">Every place tells a story</p>
                </div>
                <ChapterFilter value={mapScope} onChange={setMapScope} />
              </div>
              
              <div className="archive-map-container">
                <WorldMap 
                  onCountryClick={(iso) => navigate(`/country/${iso}`)}
                  scope={mapScope}
                />
              </div>
            </section>

            {/* 5. Archive Entry Points - Minimal cards */}
            <section className="archive-entries-section">
              <ArchiveEntryPoints />
            </section>

            {/* Current Chapter - Life context (optional, below archive) */}
            <CurrentChapterCard />
          </div>
        )}
      </main>

      {/* Footer - minimal */}
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