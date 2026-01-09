import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { StatsRow } from '@/components/StatsRow';
import { TravelContext } from '@/components/TravelContext';
import { OnThisDay } from '@/components/OnThisDay';
import { BadgeGrid } from '@/components/BadgeGrid';
import { TimelinePreview } from '@/components/TimelinePreview';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitedCountries } from '@/hooks/useVisits';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Home } from 'lucide-react';
import { useState } from 'react';
import { AddTripModal } from '@/components/AddTripModal';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { getCountryByIso } from '@/data/countries';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { visitedIsos, isLoading } = useVisitedCountries();
  const [addTripOpen, setAddTripOpen] = useState(false);
  const { homeBase } = useCurrentHomeBase();

  const hasVisits = visitedIsos.length > 0;
  const homeCountry = homeBase ? getCountryByIso(homeBase.country_iso2) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-10">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Your Travel Story
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Track every country, every city, every moment. Your private travel ledger with beautifully shareable views.
            </p>
          </div>
        </section>

        {/* Empty State for new users */}
        {user && !isLoading && !hasVisits ? (
          <section className="py-16 text-center space-y-8">
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-semibold text-foreground">
                  Welcome to Waymark
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Start building your travel story by adding your first trip. Nothing is tracked automatically — you're always in control of your data.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button onClick={() => setAddTripOpen(true)} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Add Your First Trip
              </Button>
              <p className="text-xs text-muted-foreground">
                Add countries you've visited, when you went, and your memories.
              </p>
            </div>
          </section>
        ) : (
          <>
            {/* World Map */}
            <section className="opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <WorldMap onCountryClick={(iso) => navigate(`/country/${iso}`)} />
            </section>

            {/* Stats Row */}
            <section>
              <StatsRow />
            </section>

            {/* Travel Context */}
            <TravelContext />

            {/* Home Base Display */}
            {homeCountry && (
              <section className="py-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  <span>Home base: {homeCountry.name}</span>
                </p>
              </section>
            )}

            {/* On This Day Memory */}
            <OnThisDay />

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Badges Section */}
              <section className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-display font-semibold text-foreground">
                  Country Collection
                </h2>
                <BadgeGrid />
              </section>

              {/* Timeline Preview */}
              <section className="lg:col-span-1">
                <TimelinePreview />
              </section>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Waymark — Your private travel ledger</p>
        </div>
      </footer>

      <AddTripModal open={addTripOpen} onOpenChange={setAddTripOpen} />
    </div>
  );
};

export default Index;
