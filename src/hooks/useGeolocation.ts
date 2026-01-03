import { useState, useCallback } from 'react';

export interface LocationResult {
  latitude: number;
  longitude: number;
  countryCode: string;
  countryName: string;
  city?: string;
  locality?: string;
}

export interface GeolocationState {
  isLoading: boolean;
  error: string | null;
  location: LocationResult | null;
}

// Free reverse geocoding API (no API key required for basic usage)
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    isLoading: false,
    error: null,
    location: null,
  });

  const requestLocation = useCallback(async (): Promise<LocationResult | null> => {
    setState({ isLoading: true, error: null, location: null });

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setState({
        isLoading: false,
        error: 'Geolocation is not supported by your browser',
        location: null,
      });
      return null;
    }

    try {
      // Get GPS coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get country
      const response = await fetch(
        `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode location');
      }

      const data = await response.json();

      const result: LocationResult = {
        latitude,
        longitude,
        countryCode: data.countryCode || '',
        countryName: data.countryName || '',
        city: data.city || data.locality || '',
        locality: data.locality || '',
      };

      setState({
        isLoading: false,
        error: null,
        location: result,
      });

      return result;
    } catch (err) {
      let errorMessage = 'Failed to get location';
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setState({
        isLoading: false,
        error: errorMessage,
        location: null,
      });

      return null;
    }
  }, []);

  const clearLocation = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      location: null,
    });
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
