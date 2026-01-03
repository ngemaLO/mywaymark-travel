import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Navigation, MapPin, Check, X, Loader2, Trash2 } from 'lucide-react';
import { useTripMode, SuggestedVisit } from '@/hooks/useTripMode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function TripModeCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const {
    isEnabled,
    isTracking,
    suggestedVisits,
    enableTripMode,
    disableTripMode,
    clearLocations,
    dismissSuggestion,
  } = useTripMode();

  const confirmVisitMutation = useMutation({
    mutationFn: async (suggestion: SuggestedVisit) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase.from('visits').insert({
        user_id: user.id,
        country_iso2: suggestion.countryIso2,
        arrival_date: new Date(suggestion.firstSeen).toISOString().split('T')[0],
        departure_date: suggestion.lastSeen !== suggestion.firstSeen 
          ? new Date(suggestion.lastSeen).toISOString().split('T')[0]
          : null,
        source: 'trip_mode',
        source_confidence: 'medium',
      });

      if (error) throw error;
      return suggestion;
    },
    onSuccess: (suggestion) => {
      toast.success(`Added visit to ${suggestion.countryName}`);
      dismissSuggestion(suggestion.countryIso2);
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add visit');
    },
  });

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableTripMode();
    } else {
      disableTripMode();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isEnabled ? "bg-primary/10" : "bg-muted"
            )}>
              <Navigation className={cn(
                "w-5 h-5",
                isEnabled ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground">Trip Mode</h3>
                {isTracking && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? 'Collecting location while app is open'
                  : 'Suggest countries while you travel'}
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {isEnabled && (
          <div className="pt-2 border-t space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {suggestedVisits.length === 0 
                  ? 'No countries detected yet'
                  : `${suggestedVisits.length} country${suggestedVisits.length !== 1 ? 'ies' : ''} detected`}
              </span>
              {suggestedVisits.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSuggestions(true)}
                >
                  Review
                </Button>
              )}
            </div>

            {suggestedVisits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestedVisits.slice(0, 5).map(s => (
                  <Badge key={s.countryIso2} variant="secondary" className="gap-1">
                    <MapPin className="w-3 h-3" />
                    {s.countryName}
                  </Badge>
                ))}
                {suggestedVisits.length > 5 && (
                  <Badge variant="outline">+{suggestedVisits.length - 5} more</Badge>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {isEnabled 
            ? 'Location is only collected while Waymark is open. No background tracking.'
            : 'Enable to automatically detect countries you visit.'}
        </p>
      </div>

      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Detected Visits
            </DialogTitle>
            <DialogDescription>
              Confirm or dismiss countries detected during Trip Mode.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {suggestedVisits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No countries detected yet. Keep the app open while traveling.
              </p>
            ) : (
              suggestedVisits.map(suggestion => (
                <div 
                  key={suggestion.countryIso2}
                  className="p-3 rounded-lg border bg-card flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-foreground truncate">
                      {suggestion.countryName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.locationCount} location{suggestion.locationCount !== 1 ? 's' : ''} detected
                      {suggestion.cities.length > 0 && ` · ${suggestion.cities.slice(0, 2).join(', ')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => dismissSuggestion(suggestion.countryIso2)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => confirmVisitMutation.mutate(suggestion)}
                      disabled={confirmVisitMutation.isPending}
                    >
                      {confirmVisitMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {suggestedVisits.length > 0 && (
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  clearLocations();
                  setShowSuggestions(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => setShowSuggestions(false)}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
