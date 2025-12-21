import { cn } from '@/lib/utils';
import { BadgeState } from '@/hooks/useVisits';
import { Country } from '@/data/countries';
import { Check, Lock } from 'lucide-react';

interface CountryBadgeProps {
  country: Country;
  state: BadgeState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showLabel?: boolean;
}

export function CountryBadge({ 
  country, 
  state, 
  size = 'md', 
  onClick,
  showLabel = true 
}: CountryBadgeProps) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      onClick={onClick}
      disabled={state === 'locked'}
      className={cn(
        "badge-country group flex flex-col items-center gap-1.5 transition-all duration-300",
        state !== 'locked' && "hover:scale-105 cursor-pointer",
        state === 'locked' && "opacity-50 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          sizeClasses[size],
          "relative flex items-center justify-center rounded-xl font-semibold shadow-sm transition-all duration-300",
          state === 'locked' && "bg-muted text-muted-foreground",
          state === 'declared' && "bg-gradient-to-br from-amber to-amber-dark text-amber-foreground",
          state === 'verified' && "bg-primary text-primary-foreground",
          state !== 'locked' && "group-hover:shadow-lg"
        )}
      >
        {/* Country ISO code as main display */}
        <span className="font-bold tracking-tight">{country.iso2}</span>
        
        {/* State indicator */}
        {state !== 'locked' && (
          <div className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background",
            state === 'declared' && "bg-amber-light",
            state === 'verified' && "bg-badge-verified"
          )}>
            <Check className={cn(iconSize[size], "text-white")} />
          </div>
        )}
        
        {state === 'locked' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-muted border-2 border-background">
            <Lock className={cn(iconSize[size], "text-muted-foreground")} />
          </div>
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          "text-xs font-medium text-center max-w-[80px] truncate",
          state === 'locked' ? "text-muted-foreground" : "text-foreground"
        )}>
          {country.name}
        </span>
      )}
    </button>
  );
}
