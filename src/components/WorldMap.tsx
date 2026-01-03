import { useState, useCallback } from 'react';
import { useVisitedCountries } from '@/hooks/useVisits';
import { getCountryByIso } from '@/data/countries';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface WorldMapProps {
  onCountryClick?: (iso2: string) => void;
}

// Simplified world map paths - major countries
const countryPaths: Record<string, string> = {
  US: "M 55 90 L 55 120 L 130 120 L 130 90 L 110 85 L 90 88 L 70 85 Z",
  CA: "M 50 45 L 50 85 L 135 85 L 135 45 L 110 40 L 80 42 Z",
  MX: "M 55 125 L 55 155 L 95 155 L 95 125 Z",
  BR: "M 155 175 L 155 235 L 210 235 L 210 175 L 185 165 Z",
  AR: "M 165 240 L 165 295 L 195 295 L 195 240 Z",
  GB: "M 290 70 L 290 85 L 305 85 L 305 70 Z",
  FR: "M 285 95 L 285 115 L 310 115 L 310 95 Z",
  DE: "M 305 80 L 305 100 L 330 100 L 330 80 Z",
  ES: "M 270 105 L 270 125 L 295 125 L 295 105 Z",
  PT: "M 260 105 L 260 125 L 270 125 L 270 105 Z",
  IT: "M 310 100 L 310 135 L 330 135 L 330 100 Z",
  NL: "M 300 75 L 300 85 L 312 85 L 312 75 Z",
  BE: "M 295 85 L 295 92 L 305 92 L 305 85 Z",
  CH: "M 305 95 L 305 105 L 318 105 L 318 95 Z",
  AT: "M 320 95 L 320 105 L 340 105 L 340 95 Z",
  PL: "M 330 75 L 330 92 L 355 92 L 355 75 Z",
  SE: "M 315 40 L 315 70 L 330 70 L 330 40 Z",
  NO: "M 305 35 L 305 65 L 318 65 L 318 35 Z",
  FI: "M 340 35 L 340 60 L 360 60 L 360 35 Z",
  RU: "M 360 35 L 360 100 L 550 100 L 550 35 L 480 30 L 420 32 Z",
  CN: "M 480 100 L 480 160 L 560 160 L 560 100 Z",
  JP: "M 570 95 L 570 140 L 590 140 L 590 95 Z",
  KR: "M 555 105 L 555 125 L 570 125 L 570 105 Z",
  IN: "M 435 130 L 435 190 L 490 190 L 490 130 Z",
  TH: "M 505 155 L 505 190 L 525 190 L 525 155 Z",
  VN: "M 525 145 L 525 185 L 540 185 L 540 145 Z",
  MY: "M 505 195 L 505 210 L 540 210 L 540 195 Z",
  SG: "M 520 205 L 520 212 L 528 212 L 528 205 Z",
  ID: "M 505 215 L 505 240 L 580 240 L 580 215 Z",
  AU: "M 510 255 L 510 315 L 590 315 L 590 255 Z",
  NZ: "M 605 295 L 605 320 L 625 320 L 625 295 Z",
  ZA: "M 335 255 L 335 295 L 375 295 L 375 255 Z",
  EG: "M 345 125 L 345 155 L 375 155 L 375 125 Z",
  MA: "M 270 125 L 270 145 L 295 145 L 295 125 Z",
  TR: "M 350 100 L 350 120 L 395 120 L 395 100 Z",
  AE: "M 405 140 L 405 155 L 425 155 L 425 140 Z",
  IL: "M 365 125 L 365 145 L 375 145 L 375 125 Z",
};

export function WorldMap({ onCountryClick }: WorldMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const { visitedIsos, isLoading } = useVisitedCountries();
  const { user } = useAuth();

  const getCountryFill = useCallback((iso2: string) => {
    const isVisited = visitedIsos.includes(iso2);
    const isHovered = hoveredCountry === iso2;

    if (!isVisited) {
      return isHovered ? 'hsl(var(--map-land))' : 'hsl(210 20% 88%)';
    }

    // All visited countries use primary color
    if (isHovered) {
      return 'hsl(var(--map-hover))';
    }
    
    return 'hsl(var(--primary))';
  }, [hoveredCountry, visitedIsos]);

  const handleCountryClick = (iso2: string) => {
    if (visitedIsos.includes(iso2) && onCountryClick) {
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

  if (isLoading) {
    return (
      <div className="map-container">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="map-container group">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <svg
        viewBox="0 0 650 340"
        className="w-full h-full relative z-10"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ocean */}
        <rect width="100%" height="100%" fill="transparent" />
        
        {/* Country paths */}
        {Object.entries(countryPaths).map(([iso2, path]) => {
          const country = getCountryByIso(iso2);
          const isVisited = visitedIsos.includes(iso2);
          
          return (
            <g key={iso2}>
              <path
                d={path}
                fill={getCountryFill(iso2)}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                className={`transition-all duration-300 ${
                  isVisited ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                }`}
                onMouseEnter={() => setHoveredCountry(iso2)}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => handleCountryClick(iso2)}
              />
              {/* Country label on hover */}
              {hoveredCountry === iso2 && country && (
                <text
                  x={parseFloat(path.split(' ')[1]) + 15}
                  y={parseFloat(path.split(' ')[2]) + 15}
                  className="text-[8px] font-sans fill-foreground pointer-events-none"
                  textAnchor="middle"
                >
                  {country.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted" />
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
