import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyPlace {
  name: string;
  category: 'food_drink' | 'culture' | 'outdoors' | 'entertainment';
  type: string;
  description: string;
  distance_m: number;
  lat: number;
  lon: number;
  hidden_gem: boolean;
  tags: string[];
}

export interface DiscoverResult {
  location_label: string;
  data_source: 'openstreetmap' | 'ai_knowledge';
  places: NearbyPlace[];
}

export type DiscoverStatus = 'idle' | 'locating' | 'loading' | 'success' | 'permission_denied' | 'error';

export function useNearbyPlaces() {
  const [status, setStatus] = useState<DiscoverStatus>('idle');
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discover = useCallback(() => {
    setStatus('locating');
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus('loading');
        try {
          const { data, error: fnError } = await supabase.functions.invoke('discover-nearby', {
            body: {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            },
          });
          if (fnError) throw new Error(fnError.message);
          if (data?.error) throw new Error(data.error);
          setResult(data as DiscoverResult);
          setStatus('success');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load nearby places.');
          setStatus('error');
        }
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setStatus('permission_denied');
        } else {
          setError('Unable to get your location. Please try again.');
          setStatus('error');
        }
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { discover, reset, status, result, error };
}
