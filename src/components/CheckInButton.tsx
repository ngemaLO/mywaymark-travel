import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, Loader2, Check, X, Navigation, Building2 } from 'lucide-react';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function CheckInButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'initial' | 'locating' | 'confirm' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);
  
  const {
    isLocating,
    isSaving,
    locationResult,
    previewLocation,
    confirmCheckIn,
    clearLocation,
  } = useCheckIn();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setStep('initial');
      setError(null);
      clearLocation();
    }
  };

  const handleGetLocation = async () => {
    setStep('locating');
    setError(null);
    try {
      await previewLocation();
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
      setStep('error');
    }
  };

  const handleConfirm = async (includeCity: boolean) => {
    try {
      await confirmCheckIn(includeCity);
      setIsOpen(false);
      setStep('initial');
    } catch {
      // Error handled by hook
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-primary hover:bg-primary/90"
        size="lg"
      >
        <MapPin className="w-5 h-5" />
        Check In
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Check In
            </DialogTitle>
            <DialogDescription>
              Record your current location as a visit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {step === 'initial' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center space-y-3">
                  <Navigation className="w-10 h-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tap below to detect your current location.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your location is only collected when you explicitly check in.
                    </p>
                  </div>
                </div>
                <Button onClick={handleGetLocation} className="w-full gap-2" size="lg">
                  <MapPin className="w-4 h-4" />
                  Get My Location
                </Button>
              </div>
            )}

            {step === 'locating' && (
              <div className="p-8 text-center space-y-4">
                <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {isLocating ? 'Getting your location...' : 'Looking up location details...'}
                </p>
              </div>
            )}

            {step === 'confirm' && locationResult && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-card space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">
                        {locationResult.countryName || 'Unknown Country'}
                      </h3>
                      {locationResult.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {locationResult.city}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {locationResult.lat.toFixed(4)}, {locationResult.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => handleConfirm(true)} 
                    className="w-full gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Confirm Check-in
                    {locationResult.city && ` (${locationResult.countryName}, ${locationResult.city})`}
                  </Button>
                  
                  {locationResult.city && (
                    <Button 
                      onClick={() => handleConfirm(false)} 
                      variant="outline"
                      className="w-full gap-2"
                      disabled={isSaving}
                    >
                      Country Only ({locationResult.countryName})
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => {
                      setStep('initial');
                      clearLocation();
                    }} 
                    variant="ghost"
                    className="w-full gap-2"
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-lg text-center space-y-3",
                  "bg-destructive/10 border border-destructive/20"
                )}>
                  <X className="w-10 h-10 mx-auto text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Could not get location
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {error || 'Please check your location permissions and try again.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleGetLocation} 
                    className="flex-1 gap-2"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => handleOpenChange(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your location data is stored privately and never shared without your consent.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
