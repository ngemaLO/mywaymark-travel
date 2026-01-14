import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Calendar, Loader2, UserPlus } from 'lucide-react';
import { useCreateConnectionRequest } from '@/hooks/useTripConnections';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';

interface ConnectionPreviewProps {
  codeData: {
    user_id: string;
    trip_id: string;
    trips: {
      id: string;
      start_date: string;
      end_date: string | null;
      title: string | null;
    };
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConnectionPreview({ codeData, onConfirm, onCancel }: ConnectionPreviewProps) {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ display_name: string | null } | null>(null);
  const [tripLocation, setTripLocation] = useState<string | null>(null);
  const createConnection = useCreateConnectionRequest();

  useEffect(() => {
    // Fetch the other user's profile
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', codeData.user_id)
        .single();
      setUserProfile(data);
    }

    // Fetch the trip's location from visits
    async function fetchLocation() {
      const { data } = await supabase
        .from('visits')
        .select('country_iso2')
        .eq('trip_id', codeData.trip_id)
        .limit(1)
        .single();
      
      if (data?.country_iso2) {
        const country = getCountryByIso(data.country_iso2);
        setTripLocation(country?.name || data.country_iso2);
      }
    }

    fetchProfile();
    fetchLocation();
  }, [codeData]);

  const handleConnect = async () => {
    await createConnection.mutateAsync({
      tripId: codeData.trip_id,
      otherUserId: codeData.user_id,
    });
    onConfirm();
  };

  const isSameUser = user?.id === codeData.user_id;
  const displayName = userProfile?.display_name || 'Traveler';
  const initials = displayName.slice(0, 2).toUpperCase();

  const tripDateRange = codeData.trips?.end_date
    ? `${format(new Date(codeData.trips.start_date), 'MMM d')} – ${format(new Date(codeData.trips.end_date), 'MMM d, yyyy')}`
    : `${format(new Date(codeData.trips.start_date), 'MMM d, yyyy')} – Ongoing`;

  if (isSameUser) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">This is your own QR code!</p>
          <Button onClick={onCancel}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-6 space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">wants to connect</p>
          </div>
        </div>

        {/* Trip Details */}
        <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
          {tripLocation && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{tripLocation}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{tripDateRange}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button 
            onClick={handleConnect} 
            className="w-full"
            disabled={createConnection.isPending}
          >
            {createConnection.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Connect for this trip
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You'll be able to message each other during this trip
        </p>
      </CardContent>
    </Card>
  );
}
