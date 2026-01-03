import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGeolocation, LocationResult } from '@/hooks/useGeolocation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Loader2, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import { getCountryByIso } from '@/data/countries';

interface CheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'detecting' | 'confirm' | 'success' | 'error';

export function CheckInModal({ open, onOpenChange }: CheckInModalProps) {
  const [step, setStep] = useState<Step>('detecting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading, error, location, requestLocation, clearLocation } = useGeolocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Start location detection when modal opens
  useEffect(() => {
    if (open) {
      setStep('detecting');
      requestLocation().then((result) => {
        if (result) {
          setStep('confirm');
        } else {
          setStep('error');
        }
      });
    } else {
      clearLocation();
      setStep('detecting');
    }
  }, [open, requestLocation, clearLocation]);

  const handleConfirmCheckIn = async () => {
    if (!location || !user) return;

    setIsSubmitting(true);

    try {
      // Check if country exists in our database
      const { data: countryData } = await supabase
        .from('countries')
        .select('iso2')
        .eq('iso2', location.countryCode)
        .single();

      // Insert visit
      const { error: insertError } = await supabase.from('visits').insert({
        user_id: user.id,
        country_iso2: location.countryCode,
        arrival_date: new Date().toISOString().split('T')[0],
        source: 'checkin',
        source_confidence: 'high',
      });

      if (insertError) throw insertError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['visitedCountries'] });

      setStep('success');
      
      toast.success(`Checked in to ${location.countryName}!`, {
        description: location.city ? `Near ${location.city}` : undefined,
      });

      // Close modal after brief delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error('Check-in failed:', err);
      toast.error('Failed to check in. Please try again.');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStep('detecting');
    requestLocation().then((result) => {
      if (result) {
        setStep('confirm');
      } else {
        setStep('error');
      }
    });
  };

  const getCountryFlagColor = (countryCode: string) => {
    const country = getCountryByIso(countryCode);
    return country?.flagPrimaryColor || 'hsl(var(--primary))';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Check In
          </DialogTitle>
          <DialogDescription>
            {step === 'detecting' && 'Detecting your current location...'}
            {step === 'confirm' && 'Confirm your location to check in'}
            {step === 'success' && 'You\'re all set!'}
            {step === 'error' && 'Unable to detect location'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Detecting State */}
          {step === 'detecting' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Please allow location access when prompted
              </p>
            </div>
          )}

          {/* Confirm State */}
          {step === 'confirm' && location && (
            <div className="flex flex-col items-center gap-6">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${getCountryFlagColor(location.countryCode)}20` }}
              >
                <MapPin 
                  className="w-10 h-10" 
                  style={{ color: getCountryFlagColor(location.countryCode) }}
                />
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-display font-bold text-foreground">
                  {location.countryName}
                </h3>
                {location.city && (
                  <p className="text-muted-foreground">
                    Near {location.city}
                  </p>
                )}
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleConfirmCheckIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirm Check In
                </Button>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && location && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${getCountryFlagColor(location.countryCode)}20` }}
              >
                <CheckCircle2 
                  className="w-10 h-10" 
                  style={{ color: getCountryFlagColor(location.countryCode) }}
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-display font-bold text-foreground">
                  Checked in!
                </h3>
                <p className="text-muted-foreground">
                  {location.countryName} added to your travels
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Location Error
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {error || 'Unable to detect your location. Please check your browser settings and try again.'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
