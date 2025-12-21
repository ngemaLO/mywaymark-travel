export type BadgeState = 'locked' | 'declared' | 'verified';

export interface Visit {
  id: string;
  countryIso2: string;
  placeId?: string;
  arrivalDate: string;
  departureDate?: string;
  source: 'google' | 'flight' | 'manual';
}

export interface Trip {
  id: string;
  title?: string;
  startDate: string;
  endDate: string;
  visits: Visit[];
  source: 'google' | 'flight' | 'manual';
}

export interface CountryNote {
  countryIso2: string;
  note: string;
  updatedAt: string;
}

export interface CountryImage {
  id: string;
  countryIso2: string;
  imageUrl: string;
  thumbUrl?: string;
}

export interface Place {
  id: string;
  type: 'city' | 'poi';
  name: string;
  countryIso2: string;
}

// Mock visited countries with their badge states
export const mockVisitedCountries: Record<string, { state: BadgeState; visitCount: number }> = {
  "ZA": { state: 'verified', visitCount: 5 },
  "GB": { state: 'verified', visitCount: 3 },
  "FR": { state: 'verified', visitCount: 2 },
  "ES": { state: 'declared', visitCount: 1 },
  "IT": { state: 'verified', visitCount: 2 },
  "NL": { state: 'declared', visitCount: 1 },
  "PT": { state: 'verified', visitCount: 1 },
  "DE": { state: 'verified', visitCount: 4 },
  "JP": { state: 'verified', visitCount: 1 },
  "TH": { state: 'declared', visitCount: 2 },
  "US": { state: 'verified', visitCount: 3 },
  "AU": { state: 'declared', visitCount: 1 },
};

export const mockPlaces: Place[] = [
  { id: "p1", type: "city", name: "Cape Town", countryIso2: "ZA" },
  { id: "p2", type: "city", name: "Johannesburg", countryIso2: "ZA" },
  { id: "p3", type: "city", name: "London", countryIso2: "GB" },
  { id: "p4", type: "city", name: "Paris", countryIso2: "FR" },
  { id: "p5", type: "city", name: "Barcelona", countryIso2: "ES" },
  { id: "p6", type: "city", name: "Amsterdam", countryIso2: "NL" },
  { id: "p7", type: "city", name: "Rome", countryIso2: "IT" },
  { id: "p8", type: "city", name: "Berlin", countryIso2: "DE" },
  { id: "p9", type: "city", name: "Tokyo", countryIso2: "JP" },
  { id: "p10", type: "city", name: "Bangkok", countryIso2: "TH" },
  { id: "p11", type: "city", name: "New York", countryIso2: "US" },
  { id: "p12", type: "city", name: "Sydney", countryIso2: "AU" },
  { id: "p13", type: "city", name: "Lisbon", countryIso2: "PT" },
  { id: "p14", type: "city", name: "Munich", countryIso2: "DE" },
  { id: "p15", type: "city", name: "Florence", countryIso2: "IT" },
];

export const mockTrips: Trip[] = [
  {
    id: "t1",
    title: "European Summer 2024",
    startDate: "2024-06-15",
    endDate: "2024-07-10",
    source: 'verified' as any,
    visits: [
      { id: "v1", countryIso2: "FR", placeId: "p4", arrivalDate: "2024-06-15", departureDate: "2024-06-22", source: 'google' },
      { id: "v2", countryIso2: "ES", placeId: "p5", arrivalDate: "2024-06-22", departureDate: "2024-06-30", source: 'google' },
      { id: "v3", countryIso2: "PT", placeId: "p13", arrivalDate: "2024-06-30", departureDate: "2024-07-10", source: 'google' },
    ]
  },
  {
    id: "t2",
    title: "Japan Adventure",
    startDate: "2024-03-20",
    endDate: "2024-04-05",
    source: 'flight' as any,
    visits: [
      { id: "v4", countryIso2: "JP", placeId: "p9", arrivalDate: "2024-03-20", departureDate: "2024-04-05", source: 'flight' },
    ]
  },
  {
    id: "t3",
    title: "Home Visit",
    startDate: "2023-12-20",
    endDate: "2024-01-15",
    source: 'manual' as any,
    visits: [
      { id: "v5", countryIso2: "ZA", placeId: "p1", arrivalDate: "2023-12-20", departureDate: "2024-01-15", source: 'manual' },
    ]
  },
  {
    id: "t4",
    title: "NYC Weekend",
    startDate: "2024-02-10",
    endDate: "2024-02-14",
    source: 'flight' as any,
    visits: [
      { id: "v6", countryIso2: "US", placeId: "p11", arrivalDate: "2024-02-10", departureDate: "2024-02-14", source: 'flight' },
    ]
  },
];

export const mockCountryNotes: CountryNote[] = [
  { countryIso2: "ZA", note: "Home country. Best sunsets in the world. Need to visit Kruger again soon.", updatedAt: "2024-01-15" },
  { countryIso2: "JP", note: "Incredible food scene in Tokyo. Must return for cherry blossom season.", updatedAt: "2024-04-05" },
  { countryIso2: "FR", note: "Paris never disappoints. The Marais is my favorite neighborhood.", updatedAt: "2024-06-22" },
];

export const mockStats = {
  countriesVisited: Object.keys(mockVisitedCountries).length,
  citiesVisited: mockPlaces.length,
  totalTrips: mockTrips.length,
  totalFlights: 18,
};

export const getVisitedCountryIsos = (): string[] => Object.keys(mockVisitedCountries);
export const getCountryBadgeState = (iso2: string): BadgeState => mockVisitedCountries[iso2]?.state || 'locked';
export const getCitiesByCountry = (iso2: string): Place[] => mockPlaces.filter(p => p.countryIso2 === iso2 && p.type === 'city');
export const getTripsByCountry = (iso2: string): Trip[] => mockTrips.filter(t => t.visits.some(v => v.countryIso2 === iso2));
export const getCountryNote = (iso2: string): CountryNote | undefined => mockCountryNotes.find(n => n.countryIso2 === iso2);
