import { Header } from '@/components/Header';
import { WorldMap } from '@/components/WorldMap';
import { StatsRow } from '@/components/StatsRow';
import { BadgeGrid } from '@/components/BadgeGrid';
import { TimelinePreview } from '@/components/TimelinePreview';
import { CheckInButton } from '@/components/CheckInButton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-10">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Your Travel Story
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Track every country, every city, every moment. Your private travel ledger with beautifully shareable views.
              </p>
            </div>
            {user && <CheckInButton />}
          </div>
        </section>

        {/* World Map */}
        <section className="opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <WorldMap onCountryClick={(iso) => navigate(`/country/${iso}`)} />
        </section>

        {/* Stats Row */}
        <section>
          <StatsRow />
        </section>

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
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Waymark — Your private travel ledger</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
