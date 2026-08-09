import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { WorldMap } from '@/components/WorldMap';
import { ArchiveLinks } from '@/components/ArchiveLinks';
import { CountryPanel } from '@/components/CountryPanel';
import { AddTripModal } from '@/components/AddTripModal';
import { useConnectionVisitedCountries, useConnectionCurrentTrips } from '@/hooks/useFollows';

export default function MapView() {
  const [panelIso, setPanelIso] = useState<string | null>(null);
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [addTripPreselect, setAddTripPreselect] = useState<string | undefined>();
  const { data: connectionVisitedIsos = [] } = useConnectionVisitedCountries();
  const { data: connectionCurrentTrips = [] } = useConnectionCurrentTrips();

  const handleLogVisitForCountry = (iso2: string) => {
    setAddTripPreselect(iso2);
    setAddTripOpen(true);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <section className="globe-hero">
        <div className="globe-hero-inner">
          <WorldMap
            heroMode
            onCountryClick={(iso) => setPanelIso(iso)}
            connectionVisitedIsos={connectionVisitedIsos}
            connectionCurrentTrips={connectionCurrentTrips}
          />
        </div>
        <div className="globe-hero-stats">
          <ArchiveLinks />
        </div>
      </section>

      <CountryPanel
        iso2={panelIso}
        onClose={() => setPanelIso(null)}
        onLogVisit={handleLogVisitForCountry}
      />
      <AddTripModal
        open={addTripOpen}
        onOpenChange={(open) => { setAddTripOpen(open); if (!open) setAddTripPreselect(undefined); }}
        preselectedCountry={addTripPreselect}
      />
      <BottomNav />
    </div>
  );
}
