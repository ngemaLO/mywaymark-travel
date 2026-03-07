import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useVisitedCountries, useVisits } from '@/hooks/useVisits';
import { getCountryByIso } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { MapHoverCard } from '@/components/MapHoverCard';
import { geoOrthographic, geoPath, geoCentroid, geoGraticule, geoInterpolate } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';
import { Home, Globe, BookOpen, RotateCcw } from 'lucide-react';
import { useChapters } from '@/hooks/useChapters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export type MapScopeValue = 'all' | 'current' | string;

interface WorldMapProps {
  onCountryClick?: (iso2: string) => void;
  scope?: MapScopeValue;
  heroMode?: boolean;
}

interface CountryFeature {
  type: 'Feature';
  id: string;
  properties: { name: string };
  geometry: GeoJSON.Geometry;
}

interface ExpandedPolygon {
  originalFeature: CountryFeature;
  geometry: GeoJSON.Polygon;
  centroid: [number, number];
  isOverseas: boolean;
  overseasInfo?: { parentName: string; territoryName: string; type: string };
}

type MapScope = 'all' | 'chapter';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const GLOBE_SIZE = 500;
const GLOBE_CENTER: [number, number] = [GLOBE_SIZE / 2, GLOBE_SIZE / 2];
const GLOBE_SCALE = 240;

interface TooltipState {
  x: number; y: number; title: string; subtitle?: string;
}

export function WorldMap({ onCountryClick, scope: externalScope, heroMode = false }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mapHoverCard, setMapHoverCard] = useState<{
    x: number; y: number; iso2: string; name: string;
  } | null>(null);
  const [geoData, setGeoData] = useState<CountryFeature[] | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();
  const { homeBase } = useCurrentHomeBase();

  // Globe rotation state
  const [rotation, setRotation] = useState<[number, number]>([0, -20]);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; rot: [number, number] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-rotate
  const [autoRotate, setAutoRotate] = useState(true);
  const animFrameRef = useRef<number>();

  const autoRotateStartTime = useRef<number>(0);

  useEffect(() => {
    if (!autoRotate || isDragging) return;
    let lastTime = performance.now();
    if (!autoRotateStartTime.current) autoRotateStartTime.current = lastTime;
    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      const elapsed = (time - autoRotateStartTime.current) / 1000;
      // Gentle latitude oscillation: swings between -35° and 35° over ~40 seconds
      const latTilt = Math.sin(elapsed * (2 * Math.PI / 40)) * 35;
      setRotation(prev => [(prev[0] + delta * 0.008) % 360, latTilt]);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [autoRotate, isDragging]);

  // Chapter scope state
  const [internalMapScope, setInternalMapScope] = useState<MapScope>('all');
  const [internalSelectedChapterId, setInternalSelectedChapterId] = useState<string | null>(null);
  const { data: chapters = [] } = useChapters();

  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => c.start_date <= today && (!c.end_date || c.end_date >= today));

  const isExternallyControlled = externalScope !== undefined;
  const mapScope: MapScope = isExternallyControlled ? (externalScope === 'all' ? 'all' : 'chapter') : internalMapScope;
  const selectedChapterId = isExternallyControlled
    ? (externalScope === 'all' ? null : externalScope === 'current' ? currentChapter?.id || null : externalScope)
    : internalSelectedChapterId;
  const setMapScope = isExternallyControlled ? () => {} : setInternalMapScope;
  const setSelectedChapterId = isExternallyControlled ? () => {} : setInternalSelectedChapterId;

  const { data: chapterVisits = [] } = useQuery({
    queryKey: ['chapter-map-visits', user?.id, selectedChapterId],
    queryFn: async () => {
      if (!user || !selectedChapterId) return [];
      const chapter = chapters.find(c => c.id === selectedChapterId);
      if (!chapter) return [];
      const chapterEnd = chapter.end_date || today;
      const { data, error } = await supabase.from('visits').select('country_iso2, arrival_date, departure_date').eq('user_id', user.id);
      if (error) throw error;
      const overlapping = (data || []).filter(v => {
        const visitEnd = v.departure_date || v.arrival_date;
        return visitEnd >= chapter.start_date && v.arrival_date <= chapterEnd;
      });
      return [...new Set(overlapping.map(v => v.country_iso2))];
    },
    enabled: !!user && !!selectedChapterId && mapScope === 'chapter',
  });

  const displayedVisitedIsos = useMemo(() => mapScope === 'all' ? visitedIsos : chapterVisits, [mapScope, visitedIsos, chapterVisits]);

  const selectedChapter = useMemo(() => {
    if (!selectedChapterId) return null;
    return chapters.find(c => c.id === selectedChapterId) || null;
  }, [selectedChapterId, chapters]);

  // Fetch visits for trip path lines
  const { data: allVisits = [] } = useVisits();
  
  // Fetch first image per visited country for pin markers
  const { data: countryFirstImages = {} } = useQuery({
    queryKey: ['country-first-images', user?.id, visitedIsos],
    queryFn: async () => {
      if (!user || visitedIsos.length === 0) return {};
      const { data, error } = await supabase
        .from('country_images')
        .select('country_iso2, image_url, thumb_url')
        .eq('user_id', user.id)
        .in('country_iso2', visitedIsos)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const img of data || []) {
        if (!map[img.country_iso2]) {
          map[img.country_iso2] = img.thumb_url || img.image_url;
        }
      }
      return map;
    },
    enabled: !!user && visitedIsos.length > 0,
  });

  // Fetch world TopoJSON data
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((res) => res.json())
      .then((topology: Topology<{ countries: GeometryCollection }>) => {
        const countries = feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
        setGeoData(countries.features as CountryFeature[]);
        setIsLoadingMap(false);
      })
      .catch((err) => { console.error('Failed to load world map data:', err); setIsLoadingMap(false); });
  }, []);

  const numericToIso2: Record<string, string> = useMemo(() => ({
    '004': 'AF', '008': 'AL', '012': 'DZ', '020': 'AD', '024': 'AO', '028': 'AG', '032': 'AR', '036': 'AU',
    '040': 'AT', '031': 'AZ', '044': 'BS', '048': 'BH', '050': 'BD', '052': 'BB', '056': 'BE', '060': 'BM',
    '064': 'BT', '068': 'BO', '070': 'BA', '072': 'BW', '076': 'BR', '084': 'BZ', '090': 'SB', '096': 'BN',
    '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY', '116': 'KH', '120': 'CM', '124': 'CA', '132': 'CV',
    '140': 'CF', '144': 'LK', '148': 'TD', '152': 'CL', '156': 'CN', '158': 'TW', '170': 'CO', '174': 'KM',
    '178': 'CG', '180': 'CD', '188': 'CR', '191': 'HR', '192': 'CU', '196': 'CY', '203': 'CZ', '204': 'BJ',
    '208': 'DK', '212': 'DM', '214': 'DO', '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET', '232': 'ER',
    '233': 'EE', '242': 'FJ', '246': 'FI', '250': 'FR', '262': 'DJ', '266': 'GA', '268': 'GE', '270': 'GM',
    '275': 'PS', '276': 'DE', '288': 'GH', '296': 'KI', '300': 'GR', '308': 'GD', '316': 'GU', '320': 'GT',
    '324': 'GN', '328': 'GY', '332': 'HT', '340': 'HN', '344': 'HK', '348': 'HU', '352': 'IS', '356': 'IN',
    '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE', '376': 'IL', '380': 'IT', '384': 'CI', '388': 'JM',
    '392': 'JP', '398': 'KZ', '400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR', '414': 'KW', '417': 'KG',
    '418': 'LA', '422': 'LB', '426': 'LS', '428': 'LV', '430': 'LR', '434': 'LY', '438': 'LI', '440': 'LT',
    '442': 'LU', '450': 'MG', '454': 'MW', '458': 'MY', '462': 'MV', '466': 'ML', '470': 'MT', '478': 'MR',
    '480': 'MU', '484': 'MX', '492': 'MC', '496': 'MN', '498': 'MD', '499': 'ME', '504': 'MA', '508': 'MZ',
    '512': 'OM', '516': 'NA', '520': 'NR', '524': 'NP', '528': 'NL', '540': 'NC', '548': 'VU', '554': 'NZ',
    '558': 'NI', '562': 'NE', '566': 'NG', '570': 'NU', '578': 'NO', '583': 'FM', '584': 'MH', '585': 'PW',
    '586': 'PK', '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE', '608': 'PH', '616': 'PL', '620': 'PT',
    '624': 'GW', '626': 'TL', '630': 'PR', '634': 'QA', '642': 'RO', '643': 'RU', '646': 'RW', '659': 'KN',
    '662': 'LC', '670': 'VC', '674': 'SM', '678': 'ST', '682': 'SA', '686': 'SN', '688': 'RS', '690': 'SC',
    '694': 'SL', '702': 'SG', '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO', '710': 'ZA', '716': 'ZW',
    '724': 'ES', '728': 'SS', '729': 'SD', '732': 'EH', '740': 'SR', '748': 'SZ', '752': 'SE', '756': 'CH',
    '760': 'SY', '762': 'TJ', '764': 'TH', '768': 'TG', '776': 'TO', '780': 'TT', '784': 'AE', '788': 'TN',
    '792': 'TR', '795': 'TM', '798': 'TV', '800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB',
    '834': 'TZ', '840': 'US', '854': 'BF', '858': 'UY', '860': 'UZ', '862': 'VE', '876': 'WF', '882': 'WS',
    '887': 'YE', '894': 'ZM', '-99': 'XK'
  }), []);

  const overseasTerritories: Record<string, { parentIso2: string; parentName: string; territoryName: string; type: string }> = useMemo(() => ({
    'French Guiana': { parentIso2: 'FR', parentName: 'France', territoryName: 'French Guiana', type: 'overseas region' },
    'Guadeloupe': { parentIso2: 'FR', parentName: 'France', territoryName: 'Guadeloupe', type: 'overseas region' },
    'Martinique': { parentIso2: 'FR', parentName: 'France', territoryName: 'Martinique', type: 'overseas region' },
    'Réunion': { parentIso2: 'FR', parentName: 'France', territoryName: 'Réunion', type: 'overseas region' },
    'Mayotte': { parentIso2: 'FR', parentName: 'France', territoryName: 'Mayotte', type: 'overseas department' },
    'French Polynesia': { parentIso2: 'FR', parentName: 'France', territoryName: 'French Polynesia', type: 'overseas collectivity' },
    'New Caledonia': { parentIso2: 'FR', parentName: 'France', territoryName: 'New Caledonia', type: 'special collectivity' },
    'Saint Pierre and Miquelon': { parentIso2: 'FR', parentName: 'France', territoryName: 'Saint Pierre and Miquelon', type: 'overseas collectivity' },
    'Wallis and Futuna': { parentIso2: 'FR', parentName: 'France', territoryName: 'Wallis and Futuna', type: 'overseas collectivity' },
    'Falkland Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Falkland Islands', type: 'overseas territory' },
    'Bermuda': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Bermuda', type: 'overseas territory' },
    'Cayman Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Cayman Islands', type: 'overseas territory' },
    'British Virgin Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'British Virgin Islands', type: 'overseas territory' },
    'Turks and Caicos Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Turks and Caicos Islands', type: 'overseas territory' },
    'Gibraltar': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Gibraltar', type: 'overseas territory' },
    'Puerto Rico': { parentIso2: 'US', parentName: 'United States', territoryName: 'Puerto Rico', type: 'unincorporated territory' },
    'Guam': { parentIso2: 'US', parentName: 'United States', territoryName: 'Guam', type: 'unincorporated territory' },
    'U.S. Virgin Islands': { parentIso2: 'US', parentName: 'United States', territoryName: 'U.S. Virgin Islands', type: 'unincorporated territory' },
    'American Samoa': { parentIso2: 'US', parentName: 'United States', territoryName: 'American Samoa', type: 'unincorporated territory' },
    'Northern Mariana Islands': { parentIso2: 'US', parentName: 'United States', territoryName: 'Northern Mariana Islands', type: 'commonwealth' },
    'Aruba': { parentIso2: 'NL', parentName: 'Netherlands', territoryName: 'Aruba', type: 'constituent country' },
    'Curaçao': { parentIso2: 'NL', parentName: 'Netherlands', territoryName: 'Curaçao', type: 'constituent country' },
    'Sint Maarten': { parentIso2: 'NL', parentName: 'Netherlands', territoryName: 'Sint Maarten', type: 'constituent country' },
    'Greenland': { parentIso2: 'DK', parentName: 'Denmark', territoryName: 'Greenland', type: 'autonomous territory' },
    'Faroe Islands': { parentIso2: 'DK', parentName: 'Denmark', territoryName: 'Faroe Islands', type: 'autonomous territory' },
    'Norfolk Island': { parentIso2: 'AU', parentName: 'Australia', territoryName: 'Norfolk Island', type: 'external territory' },
    'Christmas Island': { parentIso2: 'AU', parentName: 'Australia', territoryName: 'Christmas Island', type: 'external territory' },
    'Cocos (Keeling) Islands': { parentIso2: 'AU', parentName: 'Australia', territoryName: 'Cocos Islands', type: 'external territory' },
    'Cook Islands': { parentIso2: 'NZ', parentName: 'New Zealand', territoryName: 'Cook Islands', type: 'associated state' },
    'Niue': { parentIso2: 'NZ', parentName: 'New Zealand', territoryName: 'Niue', type: 'associated state' },
    'Tokelau': { parentIso2: 'NZ', parentName: 'New Zealand', territoryName: 'Tokelau', type: 'dependent territory' },
  }), []);

  // Orthographic projection (globe)
  const projection = useMemo(
    () => geoOrthographic().scale(GLOBE_SCALE).translate(GLOBE_CENTER).rotate([-rotation[0], -rotation[1]]).clipAngle(90),
    [rotation]
  );
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule().step([20, 20])(), []);
  const graticulePath = useMemo(() => pathGenerator(graticule), [pathGenerator, graticule]);
  const outlinePath = useMemo(() => pathGenerator({ type: 'Sphere' } as any), [pathGenerator]);

  const getIso2FromFeature = useCallback((feature: CountryFeature): string | null => {
    const numericId = feature.id?.toString().padStart(3, '0');
    return numericToIso2[numericId] || null;
  }, [numericToIso2]);

  const getOverseasInfo = useCallback((iso2: string | null, lng: number, lat: number): { parentName: string; territoryName: string; type: string } | null => {
    if (iso2 === 'FR') {
      if (lng < -20 && lng > -60 && lat > -10 && lat < 15) return { parentName: 'France', territoryName: 'French Guiana', type: 'overseas region' };
      if (lng > 50 && lng < 60 && lat > -25 && lat < -15) return { parentName: 'France', territoryName: 'Réunion', type: 'overseas region' };
      if (lng > 40 && lng < 50 && lat > -15 && lat < -10) return { parentName: 'France', territoryName: 'Mayotte', type: 'overseas department' };
      if (lng > 160 && lng < 170 && lat > -25 && lat < -18) return { parentName: 'France', territoryName: 'New Caledonia', type: 'special collectivity' };
      if (lng < -130 && lng > -160 && lat > -25 && lat < -5) return { parentName: 'France', territoryName: 'French Polynesia', type: 'overseas collectivity' };
      if (lng < -55 && lng > -65 && lat > 12 && lat < 20) return { parentName: 'France', territoryName: 'French Caribbean', type: 'overseas region' };
    }
    if (iso2 === 'GB') { if (lng < -55 && lng > -65 && lat < -45 && lat > -55) return { parentName: 'United Kingdom', territoryName: 'Falkland Islands', type: 'overseas territory' }; }
    if (iso2 === 'US') {
      if (lng < -60 && lng > -70 && lat > 15 && lat < 20) return { parentName: 'United States', territoryName: 'Puerto Rico', type: 'unincorporated territory' };
      if (lng > 140 && lng < 150 && lat > 10 && lat < 16) return { parentName: 'United States', territoryName: 'Guam', type: 'unincorporated territory' };
    }
    if (iso2 === 'DK') { if (lng < -10 && lng > -75 && lat > 55) return { parentName: 'Denmark', territoryName: 'Greenland', type: 'autonomous territory' }; }
    return null;
  }, []);

  const expandedPolygons = useMemo(() => {
    if (!geoData) return [];
    const result: ExpandedPolygon[] = [];
    for (const f of geoData) {
      const iso2 = getIso2FromFeature(f);
      const geometry = f.geometry;
      if (geometry.type === 'Polygon') {
        const centroid = geoCentroid({ type: 'Feature', geometry, properties: {} } as GeoJSON.Feature);
        const oi = iso2 ? getOverseasInfo(iso2, centroid[0], centroid[1]) : null;
        result.push({ originalFeature: f, geometry: geometry as GeoJSON.Polygon, centroid, isOverseas: !!oi, overseasInfo: oi || undefined });
      } else if (geometry.type === 'MultiPolygon') {
        for (const coords of geometry.coordinates) {
          const polygon: GeoJSON.Polygon = { type: 'Polygon', coordinates: coords };
          const centroid = geoCentroid({ type: 'Feature', geometry: polygon, properties: {} } as GeoJSON.Feature);
          const oi = iso2 ? getOverseasInfo(iso2, centroid[0], centroid[1]) : null;
          result.push({ originalFeature: f, geometry: polygon, centroid, isOverseas: !!oi, overseasInfo: oi || undefined });
        }
      }
    }
    return result;
  }, [geoData, getIso2FromFeature, getOverseasInfo]);

  const getTooltipInfo = useCallback((feature: CountryFeature, hoverLngLat?: [number, number]): { title: string; subtitle?: string } | null => {
    const featureName = feature.properties?.name;
    const iso2 = getIso2FromFeature(feature);
    if (featureName && overseasTerritories[featureName]) {
      const t = overseasTerritories[featureName];
      return { title: t.parentName, subtitle: `${t.territoryName} (${t.type})` };
    }
    if ((iso2 === 'FR' || featureName === 'France') && hoverLngLat) {
      const [lng, lat] = hoverLngLat;
      if (lng < -20 && lng > -60 && lat > -10 && lat < 15) return { title: 'France', subtitle: 'French Guiana (overseas region)' };
      if (lng > 50 && lng < 60 && lat > -25 && lat < -15) return { title: 'France', subtitle: 'Réunion (overseas region)' };
      if (lng > 40 && lng < 50 && lat > -15 && lat < -10) return { title: 'France', subtitle: 'Mayotte (overseas department)' };
      if (lng > 160 && lng < 170 && lat > -25 && lat < -18) return { title: 'France', subtitle: 'New Caledonia (special collectivity)' };
      if (lng < -130 && lng > -160 && lat > -25 && lat < -5) return { title: 'France', subtitle: 'French Polynesia (overseas collectivity)' };
      if (lng < -55 && lng > -65 && lat > 12 && lat < 20) return { title: 'France', subtitle: 'French Caribbean (overseas region)' };
    }
    const country = iso2 ? getCountryByIso(iso2) : null;
    if (country) return { title: country.name };
    if (featureName) return { title: featureName };
    return null;
  }, [overseasTerritories, getIso2FromFeature]);

  const getPolygonFill = useCallback((iso2: string | null, isOverseas: boolean) => {
    if (!iso2) return 'hsl(var(--map-land))';
    if (isOverseas) return mapScope === 'chapter' ? 'hsl(var(--map-land) / 0.4)' : 'hsl(var(--map-land))';
    const isHomeBase = homeBase?.country_iso2 === iso2;
    const isVisited = displayedVisitedIsos.includes(iso2);
    if (mapScope === 'chapter' && !isVisited && visitedIsos.includes(iso2)) return 'hsl(var(--map-land) / 0.6)';
    if (isHomeBase || isVisited) {
      const country = getCountryByIso(iso2);
      if (country?.flagPrimaryColor) return country.flagPrimaryColor;
      return hoveredCountry === iso2 ? 'hsl(var(--map-visited-hover))' : 'hsl(var(--map-visited))';
    }
    if (mapScope === 'chapter') return hoveredCountry === iso2 ? 'hsl(var(--map-land-hover) / 0.5)' : 'hsl(var(--map-land) / 0.4)';
    return hoveredCountry === iso2 ? 'hsl(var(--map-land-hover))' : 'hsl(var(--map-land))';
  }, [hoveredCountry, displayedVisitedIsos, visitedIsos, homeBase, mapScope]);

  const getPolygonStroke = useCallback((iso2: string | null) => {
    if (homeBase?.country_iso2 === iso2) return { stroke: 'hsl(var(--foreground))', strokeWidth: 1.5 };
    return { stroke: 'hsl(var(--border) / 0.4)', strokeWidth: 0.3 };
  }, [homeBase]);

  // Home base centroid
  const homeBaseCentroid = useMemo(() => {
    if (!homeBase || !geoData) return null;
    const hf = geoData.find(f => getIso2FromFeature(f) === homeBase.country_iso2);
    if (!hf) return null;
    const centroid = geoCentroid(hf as GeoJSON.Feature);
    const projected = projection(centroid);
    if (!projected) return null;
    return { x: projected[0], y: projected[1] };
  }, [homeBase, geoData, getIso2FromFeature, projection]);

  // Pin markers for visited countries
  const pinMarkers = useMemo(() => {
    if (!geoData) return [];
    const markers: { iso2: string; x: number; y: number; name: string; imageUrl?: string }[] = [];
    const seen = new Set<string>();
    
    for (const f of geoData) {
      const iso2 = getIso2FromFeature(f);
      if (!iso2 || seen.has(iso2) || !displayedVisitedIsos.includes(iso2)) continue;
      if (homeBase?.country_iso2 === iso2) continue; // home base has its own marker
      seen.add(iso2);
      
      const centroid = geoCentroid(f as GeoJSON.Feature);
      const projected = projection(centroid);
      if (!projected) continue;
      
      const country = getCountryByIso(iso2);
      markers.push({
        iso2,
        x: projected[0],
        y: projected[1],
        name: country?.name || iso2,
        imageUrl: countryFirstImages[iso2],
      });
    }
    return markers;
  }, [geoData, displayedVisitedIsos, projection, getIso2FromFeature, homeBase, countryFirstImages]);

  // Trip path arcs between consecutive visits
  const tripPaths = useMemo(() => {
    if (!geoData || allVisits.length < 2) return [];
    
    // Sort visits chronologically
    const sorted = [...allVisits]
      .filter(v => displayedVisitedIsos.includes(v.country_iso2))
      .sort((a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime());
    
    // Build unique country centroids map
    const centroids: Record<string, [number, number]> = {};
    for (const f of geoData) {
      const iso2 = getIso2FromFeature(f);
      if (iso2 && !centroids[iso2]) {
        centroids[iso2] = geoCentroid(f as GeoJSON.Feature);
      }
    }
    
    // Generate arc paths between consecutive different countries
    const paths: { d: string; key: string }[] = [];
    const seen = new Set<string>();
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i].country_iso2;
      const to = sorted[i + 1].country_iso2;
      if (from === to) continue;
      const pairKey = `${from}-${to}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      
      const fromCoord = centroids[from];
      const toCoord = centroids[to];
      if (!fromCoord || !toCoord) continue;
      
      // Generate great circle arc with multiple points
      const interpolator = geoInterpolate(fromCoord, toCoord);
      const points: [number, number][] = [];
      const steps = 30;
      for (let t = 0; t <= steps; t++) {
        const point = interpolator(t / steps);
        const projected = projection(point);
        if (projected) {
          points.push(projected as [number, number]);
        }
      }
      
      if (points.length > 1) {
        const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
        paths.push({ d, key: pairKey });
      }
    }
    return paths;
  }, [geoData, allVisits, displayedVisitedIsos, projection, getIso2FromFeature]);

  const handleCountryClick = (iso2: string | null) => {
    if (iso2 && visitedIsos.includes(iso2) && onCountryClick) onCountryClick(iso2);
  };

  const handleScopeChange = (scope: MapScope) => {
    setMapScope(scope);
    if (scope === 'all') setSelectedChapterId(null);
    else if (scope === 'chapter' && currentChapter) setSelectedChapterId(currentChapter.id);
    else if (scope === 'chapter' && chapters.length > 0) setSelectedChapterId(chapters[0].id);
  };

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true); setAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY, rot: [...rotation] as [number, number] };
    setMapHoverCard(null); setTooltip(null);
  }, [rotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation([dragStart.current.rot[0] + dx * 0.3, Math.max(-80, Math.min(80, dragStart.current.rot[1] - dy * 0.3))]);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); dragStart.current = null; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true); setAutoRotate(false);
    dragStart.current = { x: touch.clientX, y: touch.clientY, rot: [...rotation] as [number, number] };
    setMapHoverCard(null); setTooltip(null);
  }, [rotation]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStart.current || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    setRotation([dragStart.current.rot[0] + dx * 0.3, Math.max(-80, Math.min(80, dragStart.current.rot[1] - dy * 0.3))]);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => { setIsDragging(false); dragStart.current = null; }, []);

  const handleCountryHover = useCallback((e: React.MouseEvent, polygon: ExpandedPolygon, iso2: string | null, isClickable: boolean) => {
    if (isDragging) return;
    iso2 && setHoveredCountry(iso2);
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect || !svg) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (isClickable && iso2) {
      const country = getCountryByIso(iso2);
      setMapHoverCard({ x, y, iso2, name: country?.name ?? iso2 });
      setTooltip(null);
      return;
    }
    const svgX = (x / rect.width) * GLOBE_SIZE;
    const svgY = (y / rect.height) * GLOBE_SIZE;
    const lngLat = projection.invert?.([svgX, svgY]) as [number, number] | undefined;
    const info = getTooltipInfo(polygon.originalFeature, lngLat);
    if (info) setTooltip({ x, y, title: info.title, subtitle: info.subtitle });
  }, [isDragging, projection, getTooltipInfo]);

  if (!user) {
    return (
      <div className="globe-container relative flex items-center justify-center" style={{ aspectRatio: '1' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted rounded-full" />
        <p className="text-muted-foreground z-10">Sign in to see your travel map</p>
      </div>
    );
  }

  if (isLoading || isLoadingMap) {
    return (
      <div className="flex items-center justify-center" style={{ aspectRatio: '1', maxWidth: heroMode ? '100%' : GLOBE_SIZE }}>
        <Skeleton className="w-64 h-64 rounded-full" />
      </div>
    );
  }

  const globeMaxWidth = heroMode ? 680 : GLOBE_SIZE;

  return (
    <div className="flex flex-col items-center">
      {/* Controls row */}
      <div className="flex items-center justify-between w-full pb-2 px-2" style={{ maxWidth: globeMaxWidth }}>
        <div className="flex items-center gap-2">
          {!isExternallyControlled && (
            <>
              <div className="flex items-center bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg shadow-sm overflow-hidden">
                <button onClick={() => handleScopeChange('all')} className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${mapScope === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  <Globe className="w-3.5 h-3.5" /> All Time
                </button>
                <button onClick={() => handleScopeChange('chapter')} className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${mapScope === 'chapter' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} disabled={chapters.length === 0}>
                  <BookOpen className="w-3.5 h-3.5" /> Chapter
                </button>
              </div>
              {mapScope === 'chapter' && chapters.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-card/90 backdrop-blur-sm border-border/50 shadow-sm gap-2">
                      <span className="truncate max-w-32">{selectedChapter?.title || 'Select Chapter'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {currentChapter && (
                      <>
                        <DropdownMenuItem onClick={() => setSelectedChapterId(currentChapter.id)}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">Current Chapter</p>
                            <p className="text-xs text-muted-foreground truncate">{currentChapter.title}</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {chapters.map((chapter) => (
                      <DropdownMenuItem key={chapter.id} onClick={() => setSelectedChapterId(chapter.id)}>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{chapter.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(chapter.start_date), 'MMM yyyy')}
                            {chapter.end_date ? ` - ${format(new Date(chapter.end_date), 'MMM yyyy')}` : ' - Present'}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!autoRotate && (
            <button onClick={() => setAutoRotate(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="Resume rotation">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {displayedVisitedIsos.length} countr{displayedVisitedIsos.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </div>

      {/* Globe */}
      <div
        className="relative select-none"
        style={{ width: '100%', maxWidth: globeMaxWidth, aspectRatio: '1' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoveredCountry(null); setTooltip(null); setMapHoverCard(null); }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${GLOBE_SIZE} ${GLOBE_SIZE}`}
          className="w-full h-full"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <defs>
            <radialGradient id="globe-shadow" cx="35%" cy="30%" r="60%">
              <stop offset="0%" stopColor="hsl(var(--background))" stopOpacity="0.02" />
              <stop offset="70%" stopColor="hsl(var(--foreground))" stopOpacity="0.06" />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="ocean-fill" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="hsl(var(--map-bg))" />
              <stop offset="100%" stopColor="hsl(var(--map-bg) / 0.85)" />
            </radialGradient>
            <radialGradient id="globe-highlight" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            {/* Clip for pin images */}
            {pinMarkers.filter(m => m.imageUrl).map(m => (
              <clipPath key={`clip-${m.iso2}`} id={`pin-clip-${m.iso2}`}>
                <circle cx={m.x} cy={m.y} r="10" />
              </clipPath>
            ))}
          </defs>

          {/* Ocean */}
          {outlinePath && <path d={outlinePath} fill="url(#ocean-fill)" stroke="hsl(var(--map-bg) / 0.6)" strokeWidth="0.5" />}

          {/* Graticule */}
          {graticulePath && <path d={graticulePath} fill="none" stroke="hsl(var(--map-bg) / 0.4)" strokeWidth="0.3" />}

          {/* Country paths */}
          {expandedPolygons.map((polygon, index) => {
            const iso2 = getIso2FromFeature(polygon.originalFeature);
            const isHomeBase = homeBase?.country_iso2 === iso2 && !polygon.isOverseas;
            const isVisitedAllTime = iso2 ? visitedIsos.includes(iso2) && !polygon.isOverseas : false;
            const isClickable = (isVisitedAllTime || isHomeBase) && !polygon.isOverseas;
            const path = pathGenerator(polygon.geometry);
            const strokeStyle = getPolygonStroke(polygon.isOverseas ? null : iso2);
            if (!path) return null;
            return (
              <path
                key={`${polygon.originalFeature.id || index}-${index}`}
                d={path}
                fill={getPolygonFill(iso2, polygon.isOverseas)}
                stroke={strokeStyle.stroke}
                strokeWidth={strokeStyle.strokeWidth}
                className={`transition-colors duration-200 ${isClickable && !isDragging ? 'cursor-pointer hover:brightness-110' : ''}`}
                onMouseEnter={(e) => handleCountryHover(e, polygon, iso2, isClickable)}
                onMouseMove={(e) => handleCountryHover(e, polygon, iso2, isClickable)}
                onMouseLeave={() => { setHoveredCountry(null); setTooltip(null); setMapHoverCard(null); }}
                onClick={() => !isDragging && isClickable && handleCountryClick(iso2)}
              />
            );
          })}

          {/* Trip path arcs */}
          {tripPaths.map(({ d, key }) => (
            <path
              key={key}
              d={d}
              fill="none"
              stroke="hsl(var(--primary) / 0.5)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
              className="pointer-events-none"
            />
          ))}

          {/* Pin markers for visited countries */}
          {pinMarkers.map((marker) => (
            <g
              key={`pin-${marker.iso2}`}
              transform={`translate(${marker.x}, ${marker.y})`}
              className={`cursor-pointer transition-transform duration-200 ${!isDragging ? 'hover:scale-125' : ''}`}
              onClick={() => !isDragging && onCountryClick?.(marker.iso2)}
            >
              {marker.imageUrl ? (
                <>
                  <circle r="11" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
                  <clipPath id={`mc-${marker.iso2}`}>
                    <circle r="9" />
                  </clipPath>
                  <image
                    href={marker.imageUrl}
                    x="-9" y="-9" width="18" height="18"
                    clipPath={`url(#mc-${marker.iso2})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </>
              ) : (
                <>
                  <circle r="5" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="1.5" opacity="0.9" />
                  <circle r="2" fill="hsl(var(--background))" opacity="0.8" />
                </>
              )}
            </g>
          ))}

          {/* Home base icon marker */}
          {homeBaseCentroid && (
            <g transform={`translate(${homeBaseCentroid.x}, ${homeBaseCentroid.y})`} className="pointer-events-none">
              <circle r="7" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
              <path d="M0 -3 L3 0 L2.4 0 L2.4 2.4 L0.6 2.4 L0.6 0.6 L-0.6 0.6 L-0.6 2.4 L-2.4 2.4 L-2.4 0 L-3 0 Z" fill="hsl(var(--foreground))" strokeWidth="0" />
            </g>
          )}

          {/* 3D shading overlay */}
          {outlinePath && (
            <>
              <path d={outlinePath} fill="url(#globe-shadow)" pointerEvents="none" />
              <path d={outlinePath} fill="url(#globe-highlight)" pointerEvents="none" />
            </>
          )}
        </svg>

        {/* Tooltips */}
        {tooltip && !mapHoverCard && !isDragging && (
          <div className="absolute pointer-events-none z-50 rounded-md bg-popover text-popover-foreground border border-border px-3 py-2 shadow-lg" style={{ left: tooltip.x + 12, top: tooltip.y - 10, transform: 'translateY(-100%)' }}>
            <div className="text-sm font-medium">{tooltip.title}</div>
            {tooltip.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{tooltip.subtitle}</div>}
          </div>
        )}
        {mapHoverCard && !isDragging && (
          <MapHoverCard countryIso2={mapHoverCard.iso2} countryName={mapHoverCard.name} x={mapHoverCard.x} y={mapHoverCard.y} />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs pt-3 font-sans">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--map-visited))' }} />
          <span className="text-muted-foreground">{mapScope === 'chapter' ? 'Visited (this chapter)' : 'Visited'}</span>
        </div>
        {mapScope === 'chapter' && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--map-land) / 0.6)' }} />
            <span className="text-muted-foreground">Other visits</span>
          </div>
        )}
        {homeBase && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-background border-2 border-foreground flex items-center justify-center">
              <Home className="w-2.5 h-2.5 text-foreground" />
            </div>
            <span className="text-muted-foreground">Home base</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--map-land))' }} />
          <span className="text-muted-foreground">Not visited</span>
        </div>
      </div>
    </div>
  );
}
