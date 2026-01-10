import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVisitedCountries } from '@/hooks/useVisits';
import { getCountryByIso } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { MapHoverCard } from '@/components/MapHoverCard';
import { geoNaturalEarth1, geoPath, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { useCurrentHomeBase } from '@/hooks/useHomeBase';

interface WorldMapProps {
  onCountryClick?: (iso2: string) => void;
}

interface CountryFeature {
  type: 'Feature';
  id: string;
  properties: {
    name: string;
  };
  geometry: GeoJSON.Geometry;
}

// Expanded polygon with centroid info for overseas detection
interface ExpandedPolygon {
  originalFeature: CountryFeature;
  geometry: GeoJSON.Polygon;
  centroid: [number, number];
  isOverseas: boolean;
  overseasInfo?: { parentName: string; territoryName: string; type: string };
}

// TopoJSON URL from Natural Earth via jsdelivr
const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface TooltipState {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
}

export function WorldMap({ onCountryClick }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mapHoverCard, setMapHoverCard] = useState<{
    x: number;
    y: number;
    iso2: string;
    name: string;
  } | null>(null);
  const [geoData, setGeoData] = useState<CountryFeature[] | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();
  const { homeBase } = useCurrentHomeBase();

  // Fetch world TopoJSON data
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then((res) => res.json())
      .then((topology: Topology<{ countries: GeometryCollection }>) => {
        const countries = feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
        setGeoData(countries.features as CountryFeature[]);
        setIsLoadingMap(false);
      })
      .catch((err) => {
        console.error('Failed to load world map data:', err);
        setIsLoadingMap(false);
      });
  }, []);

  // ISO numeric to ISO2 mapping (Natural Earth uses ISO numeric codes)
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

  // Overseas territories mapping: maps parent ISO2 to territory info by GeoJSON feature name
  const overseasTerritories: Record<string, { parentIso2: string; parentName: string; territoryName: string; type: string }> = useMemo(() => ({
    // French overseas territories
    'French Guiana': { parentIso2: 'FR', parentName: 'France', territoryName: 'French Guiana', type: 'overseas region' },
    'Guadeloupe': { parentIso2: 'FR', parentName: 'France', territoryName: 'Guadeloupe', type: 'overseas region' },
    'Martinique': { parentIso2: 'FR', parentName: 'France', territoryName: 'Martinique', type: 'overseas region' },
    'Réunion': { parentIso2: 'FR', parentName: 'France', territoryName: 'Réunion', type: 'overseas region' },
    'Mayotte': { parentIso2: 'FR', parentName: 'France', territoryName: 'Mayotte', type: 'overseas department' },
    'French Polynesia': { parentIso2: 'FR', parentName: 'France', territoryName: 'French Polynesia', type: 'overseas collectivity' },
    'New Caledonia': { parentIso2: 'FR', parentName: 'France', territoryName: 'New Caledonia', type: 'special collectivity' },
    'Saint Pierre and Miquelon': { parentIso2: 'FR', parentName: 'France', territoryName: 'Saint Pierre and Miquelon', type: 'overseas collectivity' },
    'Wallis and Futuna': { parentIso2: 'FR', parentName: 'France', territoryName: 'Wallis and Futuna', type: 'overseas collectivity' },
    // UK overseas territories
    'Falkland Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Falkland Islands', type: 'overseas territory' },
    'Bermuda': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Bermuda', type: 'overseas territory' },
    'Cayman Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Cayman Islands', type: 'overseas territory' },
    'British Virgin Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'British Virgin Islands', type: 'overseas territory' },
    'Turks and Caicos Islands': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Turks and Caicos Islands', type: 'overseas territory' },
    'Gibraltar': { parentIso2: 'GB', parentName: 'United Kingdom', territoryName: 'Gibraltar', type: 'overseas territory' },
    // US territories
    'Puerto Rico': { parentIso2: 'US', parentName: 'United States', territoryName: 'Puerto Rico', type: 'unincorporated territory' },
    'Guam': { parentIso2: 'US', parentName: 'United States', territoryName: 'Guam', type: 'unincorporated territory' },
    'U.S. Virgin Islands': { parentIso2: 'US', parentName: 'United States', territoryName: 'U.S. Virgin Islands', type: 'unincorporated territory' },
    'American Samoa': { parentIso2: 'US', parentName: 'United States', territoryName: 'American Samoa', type: 'unincorporated territory' },
    'Northern Mariana Islands': { parentIso2: 'US', parentName: 'United States', territoryName: 'Northern Mariana Islands', type: 'commonwealth' },
    // Dutch territories
    'Aruba': { parentIso2: 'NL', parentName: 'Netherlands', territoryName: 'Aruba', type: 'constituent country' },
    'Curaçao': { parentIso2: 'NL', parentName: 'Netherlands', territoryName: 'Curaçao', type: 'constituent country' },
    'Sint Maarten': { parentIso2: 'NL', parentName: 'Netherlands', territoryName: 'Sint Maarten', type: 'constituent country' },
    // Danish territories
    'Greenland': { parentIso2: 'DK', parentName: 'Denmark', territoryName: 'Greenland', type: 'autonomous territory' },
    'Faroe Islands': { parentIso2: 'DK', parentName: 'Denmark', territoryName: 'Faroe Islands', type: 'autonomous territory' },
    // Australian territories
    'Norfolk Island': { parentIso2: 'AU', parentName: 'Australia', territoryName: 'Norfolk Island', type: 'external territory' },
    'Christmas Island': { parentIso2: 'AU', parentName: 'Australia', territoryName: 'Christmas Island', type: 'external territory' },
    'Cocos (Keeling) Islands': { parentIso2: 'AU', parentName: 'Australia', territoryName: 'Cocos Islands', type: 'external territory' },
    // New Zealand territories
    'Cook Islands': { parentIso2: 'NZ', parentName: 'New Zealand', territoryName: 'Cook Islands', type: 'associated state' },
    'Niue': { parentIso2: 'NZ', parentName: 'New Zealand', territoryName: 'Niue', type: 'associated state' },
    'Tokelau': { parentIso2: 'NZ', parentName: 'New Zealand', territoryName: 'Tokelau', type: 'dependent territory' },
  }), []);

  // Projection and path generator
  const projection = useMemo(() => 
    geoNaturalEarth1()
      .scale(160)
      .translate([400, 200])
  , []);

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const getIso2FromFeature = useCallback((feature: CountryFeature): string | null => {
    const numericId = feature.id?.toString().padStart(3, '0');
    return numericToIso2[numericId] || null;
  }, [numericToIso2]);

  // Detect if a coordinate is in an overseas territory region
  const getOverseasInfo = useCallback((iso2: string | null, lng: number, lat: number): { parentName: string; territoryName: string; type: string } | null => {
    // French overseas territories
    if (iso2 === 'FR') {
      // French Guiana: roughly lng -54, lat 4 (northern South America)
      if (lng < -20 && lng > -60 && lat > -10 && lat < 15) {
        return { parentName: 'France', territoryName: 'French Guiana', type: 'overseas region' };
      }
      // Réunion: roughly lng 55, lat -21 (Indian Ocean)
      if (lng > 50 && lng < 60 && lat > -25 && lat < -15) {
        return { parentName: 'France', territoryName: 'Réunion', type: 'overseas region' };
      }
      // Mayotte: roughly lng 45, lat -13 (Indian Ocean)
      if (lng > 40 && lng < 50 && lat > -15 && lat < -10) {
        return { parentName: 'France', territoryName: 'Mayotte', type: 'overseas department' };
      }
      // New Caledonia: roughly lng 165, lat -21 (Pacific)
      if (lng > 160 && lng < 170 && lat > -25 && lat < -18) {
        return { parentName: 'France', territoryName: 'New Caledonia', type: 'special collectivity' };
      }
      // French Polynesia: roughly lng -140 to -150, lat -15 to -20 (Pacific)
      if (lng < -130 && lng > -160 && lat > -25 && lat < -5) {
        return { parentName: 'France', territoryName: 'French Polynesia', type: 'overseas collectivity' };
      }
      // Guadeloupe/Martinique: Caribbean
      if (lng < -55 && lng > -65 && lat > 12 && lat < 20) {
        return { parentName: 'France', territoryName: 'French Caribbean', type: 'overseas region' };
      }
    }
    
    // UK overseas territories
    if (iso2 === 'GB') {
      // Falkland Islands: roughly lng -59, lat -52
      if (lng < -55 && lng > -65 && lat < -45 && lat > -55) {
        return { parentName: 'United Kingdom', territoryName: 'Falkland Islands', type: 'overseas territory' };
      }
    }
    
    // US territories
    if (iso2 === 'US') {
      // Puerto Rico: roughly lng -66, lat 18
      if (lng < -60 && lng > -70 && lat > 15 && lat < 20) {
        return { parentName: 'United States', territoryName: 'Puerto Rico', type: 'unincorporated territory' };
      }
      // Guam: roughly lng 145, lat 13
      if (lng > 140 && lng < 150 && lat > 10 && lat < 16) {
        return { parentName: 'United States', territoryName: 'Guam', type: 'unincorporated territory' };
      }
    }
    
    // Denmark territories
    if (iso2 === 'DK') {
      // Greenland: roughly lng -42, lat 72
      if (lng < -10 && lng > -75 && lat > 55) {
        return { parentName: 'Denmark', territoryName: 'Greenland', type: 'autonomous territory' };
      }
    }
    
    return null;
  }, []);

  // Expand features to separate MultiPolygon parts for proper overseas coloring
  const expandedPolygons = useMemo(() => {
    if (!geoData) return [];
    
    const result: ExpandedPolygon[] = [];
    
    for (const feature of geoData) {
      const iso2 = getIso2FromFeature(feature);
      const geometry = feature.geometry;
      
      if (geometry.type === 'Polygon') {
        const centroid = geoCentroid({ type: 'Feature', geometry, properties: {} } as GeoJSON.Feature);
        const overseasInfo = iso2 ? getOverseasInfo(iso2, centroid[0], centroid[1]) : null;
        result.push({
          originalFeature: feature,
          geometry: geometry as GeoJSON.Polygon,
          centroid,
          isOverseas: !!overseasInfo,
          overseasInfo: overseasInfo || undefined
        });
      } else if (geometry.type === 'MultiPolygon') {
        // Split into individual polygons
        for (const coords of geometry.coordinates) {
          const polygon: GeoJSON.Polygon = { type: 'Polygon', coordinates: coords };
          const centroid = geoCentroid({ type: 'Feature', geometry: polygon, properties: {} } as GeoJSON.Feature);
          const overseasInfo = iso2 ? getOverseasInfo(iso2, centroid[0], centroid[1]) : null;
          result.push({
            originalFeature: feature,
            geometry: polygon,
            centroid,
            isOverseas: !!overseasInfo,
            overseasInfo: overseasInfo || undefined
          });
        }
      }
    }
    
    return result;
  }, [geoData, getIso2FromFeature, getOverseasInfo]);

  // Get tooltip info for a feature (handles overseas territories via hover point detection)
  const getTooltipInfo = useCallback((feature: CountryFeature, hoverLngLat?: [number, number]): { title: string; subtitle?: string } | null => {
    const featureName = feature.properties?.name;
    const iso2 = getIso2FromFeature(feature);
    
    // Check if it's an overseas territory by name first
    if (featureName && overseasTerritories[featureName]) {
      const territory = overseasTerritories[featureName];
      return {
        title: territory.parentName,
        subtitle: `${territory.territoryName} (${territory.type})`
      };
    }
    
    // Hover-point-based detection for France overseas territories
    if ((iso2 === 'FR' || featureName === 'France') && hoverLngLat) {
      const [lng, lat] = hoverLngLat;
      
      // French Guiana: roughly lng -54, lat 4 (northern South America)
      if (lng < -20 && lng > -60 && lat > -10 && lat < 15) {
        return {
          title: 'France',
          subtitle: 'French Guiana (overseas region)'
        };
      }
      
      // Réunion: roughly lng 55, lat -21 (Indian Ocean, east of Madagascar)
      if (lng > 50 && lng < 60 && lat > -25 && lat < -15) {
        return {
          title: 'France',
          subtitle: 'Réunion (overseas region)'
        };
      }
      
      // Mayotte: roughly lng 45, lat -13 (Indian Ocean)
      if (lng > 40 && lng < 50 && lat > -15 && lat < -10) {
        return {
          title: 'France',
          subtitle: 'Mayotte (overseas department)'
        };
      }
      
      // New Caledonia: roughly lng 165, lat -21 (Pacific)
      if (lng > 160 && lng < 170 && lat > -25 && lat < -18) {
        return {
          title: 'France',
          subtitle: 'New Caledonia (special collectivity)'
        };
      }
      
      // French Polynesia: roughly lng -140 to -150, lat -15 to -20 (Pacific)
      if (lng < -130 && lng > -160 && lat > -25 && lat < -5) {
        return {
          title: 'France',
          subtitle: 'French Polynesia (overseas collectivity)'
        };
      }
      
      // Guadeloupe/Martinique: Caribbean, roughly lng -61, lat 14-16
      if (lng < -55 && lng > -65 && lat > 12 && lat < 20) {
        return {
          title: 'France',
          subtitle: 'French Caribbean (overseas region)'
        };
      }
    }
    
    // Regular country
    const country = iso2 ? getCountryByIso(iso2) : null;
    
    if (country) {
      return { title: country.name };
    }
    
    // Fallback to feature name
    if (featureName) {
      return { title: featureName };
    }
    
    return null;
  }, [overseasTerritories, getIso2FromFeature]);

  // Get fill color - use flag colors for visited countries (including home base)
  const getPolygonFill = useCallback((iso2: string | null, isOverseas: boolean) => {
    if (!iso2) return 'hsl(var(--map-land))';
    
    // Overseas territories never show as visited (they're counted under parent for stats)
    if (isOverseas) {
      return 'hsl(var(--map-land))';
    }

    const isHomeBase = homeBase?.country_iso2 === iso2;
    const isVisited = visitedIsos.includes(iso2);
    const isHovered = hoveredCountry === iso2;

    // Both home base and visited countries use flag colors
    if (isHomeBase || isVisited) {
      const country = getCountryByIso(iso2);
      const flagColor = country?.flagPrimaryColor;
      
      if (flagColor) {
        return flagColor;
      }

      // Fallback to default visited color if no flag color
      return isHovered ? 'hsl(var(--map-visited-hover))' : 'hsl(var(--map-visited))';
    }

    // Not visited
    return isHovered ? 'hsl(var(--map-land-hover))' : 'hsl(var(--map-land))';
  }, [hoveredCountry, visitedIsos, homeBase]);

  // Get stroke style - home base gets a distinct stroke pattern
  const getPolygonStroke = useCallback((iso2: string | null) => {
    const isHomeBase = homeBase?.country_iso2 === iso2;
    
    if (isHomeBase) {
      return {
        stroke: 'hsl(var(--foreground))',
        strokeWidth: 1.5,
        strokeDasharray: '3,2'
      };
    }
    
    return {
      stroke: 'hsl(var(--map-border))',
      strokeWidth: 0.5,
      strokeDasharray: undefined
    };
  }, [homeBase]);

  const handleCountryClick = (iso2: string | null) => {
    if (iso2 && visitedIsos.includes(iso2) && onCountryClick) {
      onCountryClick(iso2);
    }
  };

  if (!user) {
    return (
      <div className="map-container group">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Sign in to see your travel map</p>
        </div>
      </div>
    );
  }

  if (isLoading || isLoadingMap) {
    return (
      <div className="map-container">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="map-container group">
      {/* Subtle grid pattern - atmospheric, tertiary */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--map-grid)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--map-grid)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <svg
        viewBox="0 0 800 450"
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Country paths - using expanded polygons for proper overseas detection */}
        {expandedPolygons.map((polygon, index) => {
          const iso2 = getIso2FromFeature(polygon.originalFeature);
          const isHomeBase = homeBase?.country_iso2 === iso2 && !polygon.isOverseas;
          const isVisited = iso2 ? visitedIsos.includes(iso2) && !polygon.isOverseas : false;
          const isClickable = (isVisited || isHomeBase) && !polygon.isOverseas;
          const path = pathGenerator(polygon.geometry);
          const strokeStyle = getPolygonStroke(polygon.isOverseas ? null : iso2);
          
          if (!path) return null;
          
          const country = iso2 ? getCountryByIso(iso2) : null;

          return (
            <path
              key={`${polygon.originalFeature.id || index}-${index}`}
              d={path}
              fill={getPolygonFill(iso2, polygon.isOverseas)}
              stroke={strokeStyle.stroke}
              strokeWidth={strokeStyle.strokeWidth}
              strokeDasharray={strokeStyle.strokeDasharray}
              className={`transition-all duration-300 ${
                isClickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
              }`}
              onMouseEnter={(e) => {
                iso2 && setHoveredCountry(iso2);

                const svg = e.currentTarget.ownerSVGElement;
                const rect = svg?.getBoundingClientRect();
                if (!rect || !svg) return;

                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (isClickable && iso2) {
                  setMapHoverCard({ x, y, iso2, name: country?.name ?? iso2 });
                  setTooltip(null);
                  return;
                }

                const svgX = (x / rect.width) * 800;
                const svgY = (y / rect.height) * 450;
                const lngLat = projection.invert?.([svgX, svgY]) as [number, number] | undefined;
                const info = getTooltipInfo(polygon.originalFeature, lngLat);
                if (info) {
                  setTooltip({ x, y, title: info.title, subtitle: info.subtitle });
                }
              }}
              onMouseMove={(e) => {
                const svg = e.currentTarget.ownerSVGElement;
                const rect = svg?.getBoundingClientRect();
                if (!rect || !svg) return;

                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                if (isClickable && iso2) {
                  setMapHoverCard({ x, y, iso2, name: country?.name ?? iso2 });
                  return;
                }

                const svgX = (x / rect.width) * 800;
                const svgY = (y / rect.height) * 450;
                const lngLat = projection.invert?.([svgX, svgY]) as [number, number] | undefined;
                const info = getTooltipInfo(polygon.originalFeature, lngLat);
                if (info) {
                  setTooltip({ x, y, title: info.title, subtitle: info.subtitle });
                }
              }}
              onMouseLeave={() => {
                setHoveredCountry(null);
                setTooltip(null);
                setMapHoverCard(null);
              }}
              onClick={() => isClickable && handleCountryClick(iso2)}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-[#0055A4] via-[#009C3B] to-[#BC002D]" />
          <span className="text-muted-foreground">Visited (flag colors)</span>
        </div>
        {homeBase && (
          <div className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ 
                backgroundColor: getCountryByIso(homeBase.country_iso2)?.flagPrimaryColor || 'hsl(var(--primary))',
                border: '1.5px dashed hsl(var(--foreground))'
              }} 
            />
            <span className="text-muted-foreground">Home base</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--map-land))' }} />
          <span className="text-muted-foreground">Not visited</span>
        </div>
      </div>

      {/* Visited count badge */}
      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-md">
        <span className="text-sm font-medium text-foreground">
          {visitedIsos.length} countries
        </span>
      </div>

      {/* Custom tooltip (non-visited countries) */}
      {tooltip && !mapHoverCard && (
        <div 
          className="absolute pointer-events-none z-50 rounded-md bg-slate-900/90 text-white px-3 py-2 shadow-lg"
          style={{ 
            left: tooltip.x + 12, 
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="text-sm font-medium">{tooltip.title}</div>
          {tooltip.subtitle && (
            <div className="text-xs text-white/70 mt-0.5">{tooltip.subtitle}</div>
          )}
        </div>
      )}

      {/* Rich hover card for visited countries */}
      {mapHoverCard && (
        <MapHoverCard
          countryIso2={mapHoverCard.iso2}
          countryName={mapHoverCard.name}
          x={mapHoverCard.x}
          y={mapHoverCard.y}
        />
      )}
    </div>
  );
}
