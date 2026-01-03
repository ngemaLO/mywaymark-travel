import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LocationResult {
  lat: number;
  lng: number;
  countryIso2: string | null;
  countryName: string | null;
  city: string | null;
  displayName: string | null;
}

export interface CheckInResult {
  visitId: string;
  location: LocationResult;
}

// Reverse geocode using OpenStreetMap Nominatim (free, no API key)
async function reverseGeocode(lat: number, lng: number): Promise<LocationResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'Waymark Travel App (contact@example.com)',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to reverse geocode location');
  }

  const data = await response.json();
  
  return {
    lat,
    lng,
    countryIso2: data.address?.country_code?.toUpperCase() || null,
    countryName: data.address?.country || null,
    city: data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || null,
    displayName: data.display_name || null,
  };
}

// Get current position with explicit user action (foreground only)
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Always get fresh position
    });
  });
}

export function useCheckIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLocating, setIsLocating] = useState(false);
  const [locationResult, setLocationResult] = useState<LocationResult | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  // Check permission state
  const checkPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(result.state);
        return result.state;
      } catch {
        // Permission API not supported
        return null;
      }
    }
    return null;
  }, []);

  // Get current location (foreground only, explicit user action)
  const getLocation = useCallback(async (): Promise<LocationResult> => {
    setIsLocating(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      const result = await reverseGeocode(latitude, longitude);
      setLocationResult(result);
      return result;
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Mutation to create a visit
  const createVisitMutation = useMutation({
    mutationFn: async ({ location, includeCity }: { location: LocationResult; includeCity: boolean }) => {
      if (!user) throw new Error('Must be logged in to check in');
      if (!location.countryIso2) throw new Error('Could not determine country from location');

      // Create the visit
      const visitData = {
        user_id: user.id,
        country_iso2: location.countryIso2,
        arrival_date: new Date().toISOString().split('T')[0],
        source: 'checkin',
        source_confidence: 'high',
      };

      const { data, error } = await supabase
        .from('visits')
        .insert(visitData)
        .select()
        .single();

      if (error) throw error;

      // If city is included, we could create a place entry
      if (includeCity && location.city) {
        // Check if place already exists
        const { data: existingPlace } = await supabase
          .from('places')
          .select('id')
          .eq('name', location.city)
          .eq('country_iso2', location.countryIso2)
          .maybeSingle();

        if (!existingPlace) {
          // Create the place (places are shared reference data)
          await supabase.from('places').insert({
            name: location.city,
            country_iso2: location.countryIso2,
            type: 'city',
            lat: location.lat,
            lng: location.lng,
          });
        }
      }

      return { visitId: data.id, location };
    },
    onSuccess: (result) => {
      const cityPart = result.location.city ? ` (${result.location.city})` : '';
      toast.success(`Checked in to ${result.location.countryName}${cityPart}!`);
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      setLocationResult(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to check in');
    },
  });

  // Main check-in function - gets location then optionally saves it
  const checkIn = useCallback(async (includeCity: boolean = false) => {
    const location = await getLocation();
    if (!location.countryIso2) {
      toast.error('Could not determine your country. Please try again.');
      return null;
    }
    return createVisitMutation.mutateAsync({ location, includeCity });
  }, [getLocation, createVisitMutation]);

  // Quick check-in without city
  const quickCheckIn = useCallback(async () => {
    return checkIn(false);
  }, [checkIn]);

  // Full check-in with city
  const fullCheckIn = useCallback(async () => {
    return checkIn(true);
  }, [checkIn]);

  // Preview location without saving
  const previewLocation = useCallback(async () => {
    await getLocation();
  }, [getLocation]);

  // Confirm and save the previewed location
  const confirmCheckIn = useCallback(async (includeCity: boolean = false) => {
    if (!locationResult) {
      toast.error('No location to confirm');
      return null;
    }
    return createVisitMutation.mutateAsync({ location: locationResult, includeCity });
  }, [locationResult, createVisitMutation]);

  // Clear previewed location
  const clearLocation = useCallback(() => {
    setLocationResult(null);
  }, []);

  return {
    isLocating,
    isSaving: createVisitMutation.isPending,
    locationResult,
    permissionState,
    checkPermission,
    previewLocation,
    confirmCheckIn,
    quickCheckIn,
    fullCheckIn,
    clearLocation,
  };
}
