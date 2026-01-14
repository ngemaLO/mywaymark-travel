import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTravelState, useEndCurrentTrip } from '@/hooks/useCurrentTrip';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Home, MapPin, Users, Check, Loader2, Plus, Plane } from 'lucide-react';
import { MeetInPersonModal } from './connections/MeetInPersonModal';

export function CurrentTripCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: travelState, isLoading } = useTravelState();
  const endTripMutation = useEndCurrentTrip();
  const [meetModalOpen, setMeetModalOpen] = useState(false);

  if (!user || isLoading) {
    return null;
  }

  // "At Home" state - now prominent with CTA
  if (!travelState || travelState.type === 'none' || travelState.type === 'at_home') {
    const country = travelState?.homeBaseCountry 
      ? getCountryByIso(travelState.homeBaseCountry)
      : null;

    return (
      <section className="narrative-section">
        <div className="current-state-card at-home">
          <div className="flex items-center gap-3">
            <div className="current-state-icon">
              <Home className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/60">
                Currently
              </p>
              <h2 className="text-lg font-display text-foreground">
                {country ? `At home in ${country.name}` : 'At home'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={() => navigate('/timeline')}
              variant="default"
              size="sm"
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Log a Trip
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => navigate('/timeline')}
            >
              <Plane className="w-3.5 h-3.5" />
              Plan a Trip
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // "Travelling" state - prominent with primary CTAs
  const currentTrip = travelState.currentTrip!;
  const country = getCountryByIso(currentTrip.country_iso2);
  if (!country) return null;

  const arrivalDate = new Date(currentTrip.arrival_date);
  const today = new Date();
  const daysAway = Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <section className="narrative-section">
      <div className="current-state-card travelling">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="current-state-icon travelling">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/60">
                  Currently in
                </p>
                <h2 className="text-lg font-display text-foreground">
                  {country.name}
                </h2>
              </div>
            </div>

            {/* Duration info */}
            <p className="text-sm text-muted-foreground/70 ml-11">
              Since {format(arrivalDate, 'MMM d')}
              {daysAway > 0 && (
                <span> · {daysAway} day{daysAway !== 1 ? 's' : ''}</span>
              )}
            </p>

            {/* Actions - primary */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/country/${currentTrip.country_iso2}`)}
                className="gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                View Trip
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMeetModalOpen(true)}
                className="gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Meet Someone
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => endTripMutation.mutate(currentTrip.id)}
                disabled={endTripMutation.isPending}
                className="gap-1.5 text-muted-foreground/60"
              >
                {endTripMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                End Trip
              </Button>
            </div>
          </div>

          {/* Country Badge */}
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold text-white/90 shrink-0"
            style={{ backgroundColor: country.flagPrimaryColor || 'hsl(var(--primary))' }}
          >
            {country.iso2}
          </div>
        </div>
      </div>

      <MeetInPersonModal
        open={meetModalOpen}
        onOpenChange={setMeetModalOpen}
        tripId={currentTrip.trip_id || currentTrip.id}
      />
    </section>
  );
}