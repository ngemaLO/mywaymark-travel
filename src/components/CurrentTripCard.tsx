import { useState } from 'react';
import { useTravelState, useEndCurrentTrip } from '@/hooks/useCurrentTrip';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { MapPin, Check, Loader2, Users, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MeetInPersonModal } from '@/components/connections/MeetInPersonModal';

export function CurrentTripCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: travelState, isLoading } = useTravelState();
  const endTripMutation = useEndCurrentTrip();
  const [meetModalOpen, setMeetModalOpen] = useState(false);

  if (!user || isLoading) {
    return null;
  }

  if (!travelState || travelState.type === 'none') {
    return null;
  }

  // Show "At Home" state - very subtle
  if (travelState.type === 'at_home') {
    const country = travelState.homeBaseCountry 
      ? getCountryByIso(travelState.homeBaseCountry)
      : null;

    return (
      <section className="flex justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
          <Home className="w-3.5 h-3.5" />
          <span>
            At home in{' '}
            <span className="text-foreground/70">{country?.name || 'your home base'}</span>
          </span>
        </div>
      </section>
    );
  }

  // Show "Travelling" state - prominent but calm
  const currentTrip = travelState.currentTrip!;
  const country = getCountryByIso(currentTrip.country_iso2);
  if (!country) return null;

  const arrivalDate = new Date(currentTrip.arrival_date);
  const today = new Date();
  const daysAway = Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <section>
      <div className="card-elevated p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            {/* Header - subtle indicator */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground/70 uppercase tracking-wider">
                Currently in
              </span>
            </div>

            {/* Country Info */}
            <div className="space-y-1">
              <h3 className="text-lg font-display text-foreground">
                {country.name}
              </h3>
              <p className="text-sm text-muted-foreground/70">
                Since {format(arrivalDate, 'MMM d')}
                {daysAway > 0 && (
                  <span> · {daysAway} day{daysAway !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>

            {/* Actions - restrained */}
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
                variant="ghost"
                size="sm"
                onClick={() => setMeetModalOpen(true)}
                className="gap-1.5 text-muted-foreground"
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

          {/* Country Badge - softer */}
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
