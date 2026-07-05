import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { AiDisclaimer } from '@/components/AiDisclaimer';
import { useAuth } from '@/contexts/AuthContext';
import { useNearbyPlaces, type NearbyPlace } from '@/hooks/useNearbyPlaces';
import {
  Sparkles,
  Loader2,
  MapPin,
  LocateFixed,
  UtensilsCrossed,
  Landmark,
  TreePine,
  Music,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = 'all' | 'food_drink' | 'culture' | 'outdoors' | 'entertainment' | 'hidden_gem';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food_drink', label: 'Food & Drink' },
  { id: 'culture', label: 'Culture' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'hidden_gem', label: 'Hidden Gems' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food_drink: UtensilsCrossed,
  culture: Landmark,
  outdoors: TreePine,
  entertainment: Music,
};

function formatDistance(m: number): string {
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function mapsUrl(name: string, lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&center=${lat},${lon}`;
}

function PlaceCard({ place }: { place: NearbyPlace }) {
  const Icon = CATEGORY_ICONS[place.category] ?? MapPin;
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-tight">{place.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{place.type}</span>
              {place.hidden_gem && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                  <Sparkles className="w-3 h-3" />
                  Hidden gem
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground shrink-0 bg-muted/40 px-2 py-1 rounded-full">
          {formatDistance(place.distance_m)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{place.description}</p>

      {place.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-muted/30 border border-border/40 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <a
        href={mapsUrl(place.name, place.lat, place.lon)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Open in Maps
      </a>
    </div>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const { discover, reset, status, result, error } = useNearbyPlaces();
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  if (!user) return <Navigate to="/auth" replace />;

  const filteredPlaces = result?.places.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'hidden_gem') return p.hidden_gem;
    return p.category === activeCategory;
  }) ?? [];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <main className="container py-8 max-w-2xl space-y-6">

        {/* Header */}
        <section className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Discover</h1>
          <p className="text-muted-foreground">Hidden gems and local spots near you.</p>
        </section>

        {/* Idle state */}
        {status === 'idle' && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <LocateFixed className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-display font-semibold text-foreground text-lg">Find what's nearby</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Waymark will use your location to surface restaurants, hidden gems, cultural spots, and more within walking distance.
              </p>
            </div>
            <Button onClick={discover} className="gap-2">
              <LocateFixed className="w-4 h-4" />
              Find places near me
            </Button>
            <AiDisclaimer variant="discover" />
          </div>
        )}

        {/* Locating */}
        {status === 'locating' && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-10 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Getting your location…</p>
          </div>
        )}

        {/* Loading (edge function) */}
        {status === 'loading' && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-10 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Finding nearby places…</p>
              <p className="text-xs text-muted-foreground">Querying OpenStreetMap and curating with AI</p>
            </div>
          </div>
        )}

        {/* Permission denied */}
        {status === 'permission_denied' && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">Location access denied</p>
                <p className="text-sm text-muted-foreground">
                  To find nearby places, allow location access in your browser settings, then try again.
                </p>
              </div>
            </div>
            <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
              <li>Click the lock or info icon in your browser's address bar</li>
              <li>Set Location to "Allow"</li>
              <li>Refresh the page and try again</li>
            </ol>
            <Button variant="outline" onClick={reset} className="w-full">
              Try again
            </Button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error ?? 'Something went wrong.'}</p>
            <Button variant="outline" onClick={discover} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        )}

        {/* Results */}
        {status === 'success' && result && (
          <div className="space-y-4">
            {/* Location + refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">{result.location_label}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8"
                onClick={discover}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>

            {/* Disclaimer — more prominent when using AI knowledge fallback */}
            <AiDisclaimer
              variant={result.data_source === 'ai_knowledge' ? 'discover-ai' : 'discover'}
            />

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const count = cat.id === 'all'
                  ? result.places.length
                  : cat.id === 'hidden_gem'
                  ? result.places.filter((p) => p.hidden_gem).length
                  : result.places.filter((p) => p.category === cat.id).length;
                if (count === 0 && cat.id !== 'all') return null;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors shrink-0',
                      activeCategory === cat.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span className={cn('ml-1.5', activeCategory === cat.id ? 'opacity-70' : 'opacity-50')}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Place cards */}
            {filteredPlaces.length > 0 ? (
              <div className="space-y-3">
                {filteredPlaces.map((place, i) => (
                  <PlaceCard key={`${place.name}-${i}`} place={place} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                No places in this category nearby.
              </p>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
