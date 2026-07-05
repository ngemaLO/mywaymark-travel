import { useParams } from 'react-router-dom';
import { usePublicShareLink, useSharedUserData } from '@/hooks/useShareLinks';
import { getCountryByIso, countries, continents } from '@/data/countries';
import { Globe, MapPin, Route, Calendar, Lock, ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const MAX_SHARED_IMAGES_PER_COUNTRY = 2;

// Simplified world map paths
const countryPaths: Record<string, string> = {
  US: "M 55 90 L 55 120 L 130 120 L 130 90 L 110 85 L 90 88 L 70 85 Z",
  CA: "M 50 45 L 50 85 L 135 85 L 135 45 L 110 40 L 80 42 Z",
  MX: "M 55 125 L 55 155 L 95 155 L 95 125 Z",
  BR: "M 155 175 L 155 235 L 210 235 L 210 175 L 185 165 Z",
  AR: "M 165 240 L 165 295 L 195 295 L 195 240 Z",
  GB: "M 290 70 L 290 85 L 305 85 L 305 70 Z",
  FR: "M 285 95 L 285 115 L 310 115 L 310 95 Z",
  DE: "M 305 80 L 305 100 L 330 100 L 330 80 Z",
  ES: "M 270 105 L 270 125 L 295 125 L 295 105 Z",
  PT: "M 260 105 L 260 125 L 270 125 L 270 105 Z",
  IT: "M 310 100 L 310 135 L 330 135 L 330 100 Z",
  NL: "M 300 75 L 300 85 L 312 85 L 312 75 Z",
  BE: "M 295 85 L 295 92 L 305 92 L 305 85 Z",
  CH: "M 305 95 L 305 105 L 318 105 L 318 95 Z",
  AT: "M 320 95 L 320 105 L 340 105 L 340 95 Z",
  PL: "M 330 75 L 330 92 L 355 92 L 355 75 Z",
  SE: "M 315 40 L 315 70 L 330 70 L 330 40 Z",
  NO: "M 305 35 L 305 65 L 318 65 L 318 35 Z",
  FI: "M 340 35 L 340 60 L 360 60 L 360 35 Z",
  RU: "M 360 35 L 360 100 L 550 100 L 550 35 L 480 30 L 420 32 Z",
  CN: "M 480 100 L 480 160 L 560 160 L 560 100 Z",
  JP: "M 570 95 L 570 140 L 590 140 L 590 95 Z",
  KR: "M 555 105 L 555 125 L 570 125 L 570 105 Z",
  IN: "M 435 130 L 435 190 L 490 190 L 490 130 Z",
  TH: "M 505 155 L 505 190 L 525 190 L 525 155 Z",
  VN: "M 525 145 L 525 185 L 540 185 L 540 145 Z",
  MY: "M 505 195 L 505 210 L 540 210 L 540 195 Z",
  SG: "M 520 205 L 520 212 L 528 212 L 528 205 Z",
  ID: "M 505 215 L 505 240 L 580 240 L 580 215 Z",
  AU: "M 510 255 L 510 315 L 590 315 L 590 255 Z",
  NZ: "M 605 295 L 605 320 L 625 320 L 625 295 Z",
  ZA: "M 335 255 L 335 295 L 375 295 L 375 255 Z",
  EG: "M 345 125 L 345 155 L 375 155 L 375 125 Z",
  MA: "M 270 125 L 270 145 L 295 145 L 295 125 Z",
  TR: "M 350 100 L 350 120 L 395 120 L 395 100 Z",
  AE: "M 405 140 L 405 155 L 425 155 L 425 140 Z",
  IL: "M 365 125 L 365 145 L 375 145 L 375 125 Z",
};

export default function SharedView() {
  const { token } = useParams<{ token: string }>();
  const { data: shareLink, isLoading: linkLoading, error: linkError } = usePublicShareLink(token);
  const { data: userData, isLoading: dataLoading } = useSharedUserData(token, shareLink);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);

  if (linkLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="w-12 h-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!shareLink || linkError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Link Not Found
          </h1>
          <p className="text-muted-foreground max-w-sm">
            This share link doesn't exist, has expired, or has been disabled by its owner.
          </p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  // Process visit data
  const visitedCountryMap = (userData?.visits || []).reduce((acc, visit) => {
    const iso = visit.country_iso2;
    if (!acc[iso]) {
      acc[iso] = { visitCount: 0, sources: new Set<string>() };
    }
    acc[iso].visitCount++;
    acc[iso].sources.add(visit.source);
    return acc;
  }, {} as Record<string, { visitCount: number; sources: Set<string> }>);

  const visitedIsos = Object.keys(visitedCountryMap);
  const uniqueCountries = visitedIsos.length;
  const uniquePlaces = new Set((userData?.visits || []).filter(v => v.place_id).map(v => v.place_id)).size;
  const tripCount = userData?.trips?.length || 0;

  // Group notes and images by country
  const notesByCountry = (userData?.notes || []).reduce((acc, note) => {
    acc[note.country_iso2] = note.note;
    return acc;
  }, {} as Record<string, string>);

  const imagesByCountry = (userData?.images || []).reduce((acc, img) => {
    if (!acc[img.country_iso2]) acc[img.country_iso2] = [];
    acc[img.country_iso2].push(img.image_url);
    return acc;
  }, {} as Record<string, string[]>);

  const getBadgeState = (iso: string): 'locked' | 'declared' | 'verified' => {
    if (!visitedCountryMap[iso]) return 'locked';
    const data = visitedCountryMap[iso];
    return data.sources.has('google') ? 'verified' : 'declared';
  };

  // Filter countries for badges
  const sortedCountries = [...countries].sort((a, b) => {
    const aVisited = visitedIsos.includes(a.iso2);
    const bVisited = visitedIsos.includes(b.iso2);
    if (aVisited && !bVisited) return -1;
    if (!aVisited && bVisited) return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredCountries = selectedContinent
    ? sortedCountries.filter(c => c.continent === selectedContinent)
    : sortedCountries;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-foreground">Waymark</span>
          </div>
          <span className="text-xs text-muted-foreground">Shared Profile</span>
        </div>
      </header>

      <main className="container py-8 space-y-10">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Travel Profile
          </h1>
          <p className="text-muted-foreground">
            A shared view of travel adventures
          </p>
        </div>

        {/* Map */}
        {shareLink.scope_map && (
          <section className="map-container">
            <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted" />
            <svg
              viewBox="0 0 650 340"
              className="w-full h-full relative z-10"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect width="100%" height="100%" fill="transparent" />
              {Object.entries(countryPaths).map(([iso2, path]) => {
                const isVisited = visitedIsos.includes(iso2);
                const state = getBadgeState(iso2);
                return (
                  <path
                    key={iso2}
                    d={path}
                    fill={
                      !isVisited ? 'hsl(210 20% 88%)' :
                      state === 'verified' ? 'hsl(var(--primary))' : 'hsl(var(--amber))'
                    }
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-md">
              <span className="text-sm font-medium text-foreground">
                {uniqueCountries} countries
              </span>
            </div>
          </section>
        )}

        {/* Stats */}
        {shareLink.scope_stats && (
          <section className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-2">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-2xl font-display font-bold text-foreground">{uniqueCountries}</span>
              <span className="text-sm text-muted-foreground">Countries</span>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-2">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-2xl font-display font-bold text-foreground">{uniquePlaces}</span>
              <span className="text-sm text-muted-foreground">Cities</span>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-2">
                <Route className="w-5 h-5" />
              </div>
              <span className="text-2xl font-display font-bold text-foreground">{tripCount}</span>
              <span className="text-sm text-muted-foreground">Trips</span>
            </div>
          </section>
        )}

        {/* Badges */}
        {shareLink.scope_badges && (
          <section className="space-y-4">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Country Collection
            </h2>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedContinent(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  selectedContinent === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                All
              </button>
              {continents.map(continent => (
                <button
                  key={continent}
                  onClick={() => setSelectedContinent(continent)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    selectedContinent === continent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {continent}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filteredCountries.slice(0, 24).map(country => {
                const state = getBadgeState(country.iso2);
                return (
                  <div key={country.iso2} className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "w-16 h-16 relative flex items-center justify-center rounded-xl font-semibold shadow-sm",
                        state === 'locked' && "bg-muted text-muted-foreground opacity-50",
                        state === 'declared' && "bg-gradient-to-br from-amber to-amber-dark text-amber-foreground",
                        state === 'verified' && "bg-primary text-primary-foreground"
                      )}
                    >
                      <span className="font-bold text-sm">{country.iso2}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center max-w-[80px] truncate",
                      state === 'locked' ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {country.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Timeline */}
        {shareLink.scope_timeline && userData?.trips && userData.trips.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Recent Trips
            </h2>
            <div className="space-y-3">
              {userData.trips.slice(0, 5).map(trip => (
                <div key={trip.id} className="card-elevated p-4">
                  <h3 className="font-medium text-foreground">
                    {trip.title || 'Untitled Trip'}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(trip.start_date), 'MMM d, yyyy')}
                      {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Country Details with Notes and Images */}
        {(shareLink.scope_notes || shareLink.scope_images) && visitedIsos.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Country Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {visitedIsos.slice(0, 6).map(iso => {
                const country = getCountryByIso(iso);
                if (!country) return null;
                const note = notesByCountry[iso];
                const countryImages = (imagesByCountry[iso] || []).slice(0, MAX_SHARED_IMAGES_PER_COUNTRY);
                
                if (!note && countryImages.length === 0) return null;

                return (
                  <div key={iso} className="card-elevated p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                        getBadgeState(iso) === 'verified' 
                          ? "bg-primary text-primary-foreground"
                          : "bg-gradient-to-br from-amber to-amber-dark text-amber-foreground"
                      )}>
                        {iso}
                      </div>
                      <h3 className="font-medium text-foreground">{country.name}</h3>
                    </div>
                    
                    {shareLink.scope_notes && note && (
                      <p className="text-sm text-muted-foreground">{note}</p>
                    )}
                    
                    {shareLink.scope_images && countryImages.length > 0 && (
                      <div className="flex gap-2">
                        {countryImages.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImage(url)}
                            className="relative w-20 h-20 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={url}
                              alt={`${country.name} photo ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                        {(imagesByCountry[iso]?.length || 0) > MAX_SHARED_IMAGES_PER_COUNTRY && (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              +{(imagesByCountry[iso]?.length || 0) - MAX_SHARED_IMAGES_PER_COUNTRY} more
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Shared via Waymark — Your all-in-one travel companion</p>
        </div>
      </footer>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size photo"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
