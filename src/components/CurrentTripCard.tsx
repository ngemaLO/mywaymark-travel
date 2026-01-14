import { useCurrentTrip, useEndCurrentTrip } from '@/hooks/useCurrentTrip';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { MapPin, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function CurrentTripCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: currentTrip, isLoading } = useCurrentTrip();
  const endTripMutation = useEndCurrentTrip();

  if (!user || isLoading) {
    return null;
  }

  if (!currentTrip) {
    return null;
  }

  const country = getCountryByIso(currentTrip.country_iso2);
  if (!country) return null;

  const arrivalDate = new Date(currentTrip.arrival_date);
  const today = new Date();
  const daysAway = Math.floor((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <section className="py-4">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  Currently Traveling
                </span>
              </div>

              {/* Country Info */}
              <div className="space-y-1">
                <h3 className="text-xl font-display font-semibold text-foreground">
                  {country.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Since {format(arrivalDate, 'MMM d, yyyy')}
                  {daysAway > 0 && (
                    <span className="text-muted-foreground/70"> · {daysAway} day{daysAway !== 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
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
                  variant="outline"
                  size="sm"
                  onClick={() => endTripMutation.mutate(currentTrip.id)}
                  disabled={endTripMutation.isPending}
                  className="gap-1.5"
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
              className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ backgroundColor: country.flagPrimaryColor || 'hsl(var(--primary))' }}
            >
              {country.iso2}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
