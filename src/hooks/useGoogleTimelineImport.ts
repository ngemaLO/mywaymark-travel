import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Approximate country bounding boxes (lat/lng) for major countries
// Format: [minLat, maxLat, minLng, maxLng]
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  US: [24.5, 49.4, -125.0, -66.9],
  CA: [41.7, 83.1, -141.0, -52.6],
  MX: [14.5, 32.7, -118.4, -86.7],
  BR: [-33.8, 5.3, -73.99, -28.8],
  AR: [-55.1, -21.8, -73.6, -53.6],
  GB: [49.9, 60.9, -8.6, 1.8],
  FR: [41.3, 51.1, -5.1, 9.6],
  DE: [47.3, 55.1, 5.9, 15.0],
  ES: [36.0, 43.8, -9.3, 3.3],
  PT: [36.8, 42.2, -9.5, -6.2],
  IT: [35.5, 47.1, 6.6, 18.5],
  NL: [50.8, 53.5, 3.4, 7.2],
  BE: [49.5, 51.5, 2.5, 6.4],
  CH: [45.8, 47.8, 5.96, 10.5],
  AT: [46.4, 49.0, 9.5, 17.2],
  PL: [49.0, 54.8, 14.1, 24.2],
  SE: [55.3, 69.1, 11.1, 24.2],
  NO: [58.0, 71.2, 4.6, 31.1],
  FI: [59.8, 70.1, 20.5, 31.6],
  RU: [41.2, 81.9, 19.6, 180.0],
  CN: [18.2, 53.6, 73.7, 134.8],
  JP: [24.0, 45.5, 122.9, 153.99],
  KR: [33.1, 38.6, 124.6, 131.0],
  IN: [6.7, 35.5, 68.2, 97.4],
  TH: [5.6, 20.5, 97.3, 105.6],
  VN: [8.4, 23.4, 102.1, 109.5],
  MY: [0.9, 7.4, 99.6, 119.3],
  SG: [1.2, 1.5, 103.6, 104.0],
  ID: [-11.0, 6.1, 95.0, 141.0],
  AU: [-43.6, -10.7, 113.2, 153.6],
  NZ: [-47.3, -34.4, 166.4, 178.6],
  ZA: [-34.8, -22.1, 16.5, 32.9],
  EG: [22.0, 31.7, 24.7, 36.9],
  MA: [27.7, 35.9, -13.2, -1.0],
  TR: [35.8, 42.1, 26.0, 44.8],
  AE: [22.6, 26.1, 51.6, 56.4],
  IL: [29.5, 33.3, 34.3, 35.9],
  GR: [34.8, 41.8, 19.4, 29.6],
  CZ: [48.6, 51.1, 12.1, 18.9],
  HU: [45.7, 48.6, 16.1, 22.9],
  IE: [51.4, 55.4, -10.5, -6.0],
  DK: [54.6, 57.8, 8.1, 15.2],
};

export interface LocationRecord {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface DetectedCountryVisit {
  id: string;
  countryIso2: string;
  countryName: string;
  firstSeen: Date;
  lastSeen: Date;
  locationCount: number;
  included: boolean;
}

function getCountryFromCoords(lat: number, lng: number): string | null {
  for (const [iso, bounds] of Object.entries(COUNTRY_BOUNDS)) {
    const [minLat, maxLat, minLng, maxLng] = bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return iso;
    }
  }
  return null;
}

// Country names mapping
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina',
  GB: 'United Kingdom', FR: 'France', DE: 'Germany', ES: 'Spain', PT: 'Portugal',
  IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria',
  PL: 'Poland', SE: 'Sweden', NO: 'Norway', FI: 'Finland', RU: 'Russia',
  CN: 'China', JP: 'Japan', KR: 'South Korea', IN: 'India', TH: 'Thailand',
  VN: 'Vietnam', MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia', AU: 'Australia',
  NZ: 'New Zealand', ZA: 'South Africa', EG: 'Egypt', MA: 'Morocco', TR: 'Turkey',
  AE: 'UAE', IL: 'Israel', GR: 'Greece', CZ: 'Czech Republic', HU: 'Hungary',
  IE: 'Ireland', DK: 'Denmark',
};

export function parseGoogleTimelineJSON(jsonText: string): { 
  locations: LocationRecord[]; 
  error?: string;
} {
  try {
    const data = JSON.parse(jsonText);
    const locations: LocationRecord[] = [];

    // Try Records.json format (newer export)
    if (data.locations && Array.isArray(data.locations)) {
      for (const loc of data.locations) {
        if (loc.latitudeE7 && loc.longitudeE7) {
          const lat = loc.latitudeE7 / 1e7;
          const lng = loc.longitudeE7 / 1e7;
          const timestamp = new Date(loc.timestamp || loc.timestampMs);
          
          if (!isNaN(timestamp.getTime())) {
            locations.push({ latitude: lat, longitude: lng, timestamp });
          }
        }
      }
    }

    // Try Semantic Location History format
    if (data.timelineObjects && Array.isArray(data.timelineObjects)) {
      for (const obj of data.timelineObjects) {
        if (obj.placeVisit?.location) {
          const loc = obj.placeVisit.location;
          if (loc.latitudeE7 && loc.longitudeE7) {
            const lat = loc.latitudeE7 / 1e7;
            const lng = loc.longitudeE7 / 1e7;
            const timestamp = new Date(
              obj.placeVisit.duration?.startTimestamp || 
              obj.placeVisit.duration?.startTimestampMs
            );
            
            if (!isNaN(timestamp.getTime())) {
              locations.push({ latitude: lat, longitude: lng, timestamp });
            }
          }
        }
      }
    }

    // Sort by timestamp
    locations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (locations.length === 0) {
      return { 
        locations: [], 
        error: 'No valid location data found. Make sure you uploaded a Google Location History JSON file.' 
      };
    }

    return { locations };
  } catch (e) {
    return { 
      locations: [], 
      error: 'Failed to parse JSON file. Please ensure it\'s a valid Google Location History export.' 
    };
  }
}

export function detectCountryVisits(locations: LocationRecord[]): DetectedCountryVisit[] {
  const countryData: Map<string, { 
    firstSeen: Date; 
    lastSeen: Date; 
    count: number;
  }> = new Map();

  for (const loc of locations) {
    const country = getCountryFromCoords(loc.latitude, loc.longitude);
    if (country) {
      const existing = countryData.get(country);
      if (existing) {
        if (loc.timestamp < existing.firstSeen) {
          existing.firstSeen = loc.timestamp;
        }
        if (loc.timestamp > existing.lastSeen) {
          existing.lastSeen = loc.timestamp;
        }
        existing.count++;
      } else {
        countryData.set(country, {
          firstSeen: loc.timestamp,
          lastSeen: loc.timestamp,
          count: 1,
        });
      }
    }
  }

  const visits: DetectedCountryVisit[] = [];
  
  for (const [iso, data] of countryData) {
    visits.push({
      id: `visit-${iso}`,
      countryIso2: iso,
      countryName: COUNTRY_NAMES[iso] || iso,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      locationCount: data.count,
      included: true,
    });
  }

  // Sort by first seen date
  visits.sort((a, b) => a.firstSeen.getTime() - b.firstSeen.getTime());

  return visits;
}

export function useImportGoogleTimeline() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      visits,
      createTrips,
    }: { 
      visits: DetectedCountryVisit[];
      createTrips: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const includedVisits = visits.filter(v => v.included);
      
      if (includedVisits.length === 0) {
        throw new Error('No visits selected for import');
      }

      // Check for existing visits to avoid duplicates
      const { data: existingVisits } = await supabase
        .from('visits')
        .select('country_iso2, arrival_date')
        .eq('user_id', user.id)
        .eq('source', 'google');

      const existingKeys = new Set(
        (existingVisits || []).map(v => `${v.country_iso2}-${v.arrival_date}`)
      );

      // Prepare visits to insert (skip duplicates)
      const visitsToInsert = includedVisits
        .filter(v => {
          const key = `${v.countryIso2}-${v.firstSeen.toISOString().split('T')[0]}`;
          return !existingKeys.has(key);
        })
        .map(v => ({
          user_id: user.id,
          country_iso2: v.countryIso2,
          arrival_date: v.firstSeen.toISOString().split('T')[0],
          departure_date: v.lastSeen.toISOString().split('T')[0],
          source: 'google',
          source_confidence: v.locationCount > 10 ? 'high' : v.locationCount > 3 ? 'medium' : 'low',
        }));

      if (visitsToInsert.length === 0) {
        return { visitsCreated: 0, tripsCreated: 0, skipped: includedVisits.length };
      }

      const { data: insertedVisits, error: visitsError } = await supabase
        .from('visits')
        .insert(visitsToInsert)
        .select();

      if (visitsError) throw visitsError;

      let tripsCreated = 0;

      // Optionally create inferred trips
      if (createTrips && insertedVisits && insertedVisits.length > 0) {
        // Group visits by approximate time periods (visits within 30 days of each other)
        const sortedVisits = [...insertedVisits].sort(
          (a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
        );

        const tripGroups: typeof insertedVisits[] = [];
        let currentGroup: typeof insertedVisits = [];

        for (const visit of sortedVisits) {
          if (currentGroup.length === 0) {
            currentGroup.push(visit);
          } else {
            const lastVisit = currentGroup[currentGroup.length - 1];
            const daysDiff = Math.abs(
              (new Date(visit.arrival_date).getTime() - new Date(lastVisit.departure_date || lastVisit.arrival_date).getTime()) 
              / (1000 * 60 * 60 * 24)
            );

            if (daysDiff <= 30) {
              currentGroup.push(visit);
            } else {
              tripGroups.push(currentGroup);
              currentGroup = [visit];
            }
          }
        }
        if (currentGroup.length > 0) {
          tripGroups.push(currentGroup);
        }

        // Create trips for each group
        for (const group of tripGroups) {
          const startDate = group[0].arrival_date;
          const endDate = group[group.length - 1].departure_date || group[group.length - 1].arrival_date;
          const countries = [...new Set(group.map(v => v.country_iso2))];
          
          const title = countries.length === 1 
            ? `${COUNTRY_NAMES[countries[0]] || countries[0]} Visit`
            : `${countries.length} Country Trip`;

          const { data: trip, error: tripError } = await supabase
            .from('trips')
            .insert({
              user_id: user.id,
              title,
              start_date: startDate,
              end_date: endDate,
              source: 'google',
              inferred: true,
            })
            .select()
            .single();

          if (!tripError && trip) {
            tripsCreated++;
            
            // Link visits to trip
            await supabase
              .from('visits')
              .update({ trip_id: trip.id })
              .in('id', group.map(v => v.id));
          }
        }
      }

      return { 
        visitsCreated: insertedVisits.length, 
        tripsCreated,
        skipped: includedVisits.length - insertedVisits.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['trips-by-country'] });
      
      let description = `Imported ${result.visitsCreated} country visits.`;
      if (result.tripsCreated > 0) {
        description += ` Created ${result.tripsCreated} inferred trips.`;
      }
      if (result.skipped > 0) {
        description += ` Skipped ${result.skipped} duplicates.`;
      }
      
      toast({ title: 'Import complete', description });
    },
    onError: (error) => {
      toast({ 
        title: 'Import failed', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
