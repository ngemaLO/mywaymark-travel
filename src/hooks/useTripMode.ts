import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface TripModeLocation {
  lat: number;
  lng: number;
  timestamp: number;
  countryIso2?: string;
  countryName?: string;
  city?: string;
}

export interface SuggestedVisit {
  countryIso2: string;
  countryName: string;
  cities: string[];
  firstSeen: number;
  lastSeen: number;
  locationCount: number;
}

// Reverse geocode using OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<{ countryIso2: string | null; countryName: string | null; city: string | null }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Waymark Travel App',
        },
      }
    );

    if (!response.ok) {
      return { countryIso2: null, countryName: null, city: null };
    }

    const data = await response.json();
    
    return {
      countryIso2: data.address?.country_code?.toUpperCase() || null,
      countryName: data.address?.country || null,
      city: data.address?.city || data.address?.town || data.address?.village || null,
    };
  } catch {
    return { countryIso2: null, countryName: null, city: null };
  }
}

const TRIP_MODE_KEY = 'waymark_trip_mode';
const TRIP_MODE_LOCATIONS_KEY = 'waymark_trip_mode_locations';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useTripMode() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [locations, setLocations] = useState<TripModeLocation[]>([]);
  const [suggestedVisits, setSuggestedVisits] = useState<SuggestedVisit[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedEnabled = localStorage.getItem(TRIP_MODE_KEY);
    const savedLocations = localStorage.getItem(TRIP_MODE_LOCATIONS_KEY);
    
    if (savedEnabled === 'true') {
      setIsEnabled(true);
    }
    
    if (savedLocations) {
      try {
        setLocations(JSON.parse(savedLocations));
      } catch {
        // Invalid JSON, reset
        localStorage.removeItem(TRIP_MODE_LOCATIONS_KEY);
      }
    }
  }, []);

  // Save locations to localStorage when they change
  useEffect(() => {
    if (locations.length > 0) {
      localStorage.setItem(TRIP_MODE_LOCATIONS_KEY, JSON.stringify(locations));
    }
  }, [locations]);

  // Process locations into suggested visits
  useEffect(() => {
    if (locations.length === 0) {
      setSuggestedVisits([]);
      return;
    }

    // Group locations by country
    const byCountry = locations.reduce((acc, loc) => {
      if (loc.countryIso2) {
        if (!acc[loc.countryIso2]) {
          acc[loc.countryIso2] = {
            countryIso2: loc.countryIso2,
            countryName: loc.countryName || loc.countryIso2,
            cities: new Set<string>(),
            firstSeen: loc.timestamp,
            lastSeen: loc.timestamp,
            locationCount: 0,
          };
        }
        acc[loc.countryIso2].locationCount++;
        if (loc.city) {
          acc[loc.countryIso2].cities.add(loc.city);
        }
        acc[loc.countryIso2].firstSeen = Math.min(acc[loc.countryIso2].firstSeen, loc.timestamp);
        acc[loc.countryIso2].lastSeen = Math.max(acc[loc.countryIso2].lastSeen, loc.timestamp);
      }
      return acc;
    }, {} as Record<string, { countryIso2: string; countryName: string; cities: Set<string>; firstSeen: number; lastSeen: number; locationCount: number }>);

    setSuggestedVisits(
      Object.values(byCountry).map(v => ({
        ...v,
        cities: Array.from(v.cities),
      }))
    );
  }, [locations]);

  // Check permission state
  const checkPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(result.state);
        return result.state;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Get current position
  const pollLocation = useCallback(async () => {
    if (!isEnabled || !document.hasFocus()) return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Save battery
          timeout: 30000,
          maximumAge: 60000, // Cache for 1 minute
        });
      });

      const { latitude, longitude } = position.coords;
      const timestamp = Date.now();

      // Check if we already have a recent location nearby
      const recent = locations.find(
        l => 
          Math.abs(l.lat - latitude) < 0.01 && 
          Math.abs(l.lng - longitude) < 0.01 &&
          timestamp - l.timestamp < 30 * 60 * 1000 // Within 30 minutes
      );

      if (!recent) {
        // Reverse geocode to get country
        const geoResult = await reverseGeocode(latitude, longitude);
        
        const newLocation: TripModeLocation = {
          lat: latitude,
          lng: longitude,
          timestamp,
          countryIso2: geoResult.countryIso2 || undefined,
          countryName: geoResult.countryName || undefined,
          city: geoResult.city || undefined,
        };

        setLocations(prev => [...prev, newLocation]);
      }
    } catch (error) {
      console.warn('Trip mode location poll failed:', error);
    }
  }, [isEnabled, locations]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (isEnabled && document.hasFocus()) {
      setIsTracking(true);
      
      // Initial poll
      pollLocation();
      
      // Set up interval
      pollIntervalRef.current = window.setInterval(pollLocation, POLL_INTERVAL);

      // Listen for visibility changes
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Stop polling when app is hidden
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsTracking(false);
        } else {
          // Resume when visible
          pollLocation();
          pollIntervalRef.current = window.setInterval(pollLocation, POLL_INTERVAL);
          setIsTracking(true);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        setIsTracking(false);
      };
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsTracking(false);
    }
  }, [isEnabled, pollLocation]);

  // Enable trip mode
  const enableTripMode = useCallback(async () => {
    const permission = await checkPermission();
    
    if (permission === 'denied') {
      toast.error('Location permission is denied. Please enable it in your browser settings.');
      return false;
    }

    // Request permission by getting current position
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
        });
      });
    } catch {
      toast.error('Could not access location. Please allow location access when prompted.');
      return false;
    }

    setIsEnabled(true);
    localStorage.setItem(TRIP_MODE_KEY, 'true');
    toast.success('Trip Mode enabled! Location will be collected while the app is open.');
    return true;
  }, [checkPermission]);

  // Disable trip mode
  const disableTripMode = useCallback(() => {
    setIsEnabled(false);
    localStorage.setItem(TRIP_MODE_KEY, 'false');
    toast.info('Trip Mode disabled.');
  }, []);

  // Clear collected locations
  const clearLocations = useCallback(() => {
    setLocations([]);
    setSuggestedVisits([]);
    localStorage.removeItem(TRIP_MODE_LOCATIONS_KEY);
  }, []);

  // Remove a suggested visit
  const dismissSuggestion = useCallback((countryIso2: string) => {
    setLocations(prev => prev.filter(l => l.countryIso2 !== countryIso2));
  }, []);

  return {
    isEnabled,
    isTracking,
    locations,
    suggestedVisits,
    permissionState,
    enableTripMode,
    disableTripMode,
    clearLocations,
    dismissSuggestion,
    checkPermission,
  };
}
