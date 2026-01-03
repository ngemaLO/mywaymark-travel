import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVisitedCountries } from '@/hooks/useVisits';
import { getCountryByIso } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

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

// TopoJSON URL from Natural Earth via jsdelivr
const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function WorldMap({ onCountryClick }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<CountryFeature[] | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();

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

  const getCountryFill = useCallback((iso2: string | null) => {
    if (!iso2) return 'hsl(var(--map-land))';
    
    const isVisited = visitedIsos.includes(iso2);
    const isHovered = hoveredCountry === iso2;

    if (!isVisited) {
      return isHovered ? 'hsl(var(--map-land-hover))' : 'hsl(var(--map-land))';
    }

    if (isHovered) {
      return 'hsl(var(--map-visited-hover))';
    }
    
    return 'hsl(var(--map-visited))';
  }, [hoveredCountry, visitedIsos]);

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
        {/* Country paths */}
        {geoData?.map((feature, index) => {
          const iso2 = getIso2FromFeature(feature);
          const country = iso2 ? getCountryByIso(iso2) : null;
          const isVisited = iso2 ? visitedIsos.includes(iso2) : false;
          const path = pathGenerator(feature.geometry);
          
          if (!path) return null;
          
          return (
            <g key={feature.id || index}>
              <path
                d={path}
                fill={getCountryFill(iso2)}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                className={`transition-all duration-300 ${
                  isVisited ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                }`}
                onMouseEnter={() => iso2 && setHoveredCountry(iso2)}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => handleCountryClick(iso2)}
              />
              {/* Country tooltip on hover */}
              {hoveredCountry === iso2 && country && (
                <title>{country.name}</title>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--map-visited))' }} />
          <span className="text-muted-foreground">Visited</span>
        </div>
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
    </div>
  );
}
