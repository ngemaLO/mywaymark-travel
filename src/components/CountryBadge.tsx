import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Country } from '@/data/countries';
import { Check } from 'lucide-react';

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

interface CountryBadgeProps {
  country: Country;
  visited: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showLabel?: boolean;
}

export const CountryBadge = forwardRef<HTMLButtonElement, CountryBadgeProps>(({ 
  country, 
  visited, 
  size = 'md', 
  onClick,
  showLabel = true,
  ...props
}, ref) => {
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
      ref={ref}
      onClick={onClick}
      disabled={!visited}
      className={cn(
        "badge-country group flex flex-col items-center gap-1.5 transition-all duration-300",
        visited && "hover:scale-105 cursor-pointer",
        !visited && "opacity-40 cursor-not-allowed"
      )}
      {...props}
    >
      <div
        className={cn(
          sizeClasses[size],
          "relative flex items-center justify-center rounded-xl font-semibold shadow-sm transition-all duration-300",
          !visited && "bg-muted text-muted-foreground",
          visited && "group-hover:shadow-lg"
        )}
        style={visited && country.flagPrimaryColor ? { backgroundColor: country.flagPrimaryColor, color: 'white' } : undefined}
      >
        {/* Country flag emoji */}
        <span className="text-2xl leading-none">{isoToFlag(country.iso2)}</span>
        
        {/* Visited indicator */}
        {visited && (
          <div 
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background"
            style={country.flagPrimaryColor ? { backgroundColor: country.flagPrimaryColor } : { backgroundColor: 'hsl(var(--primary))' }}
          >
            <Check className={cn(iconSize[size], "text-white")} />
          </div>
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          "text-xs font-medium text-center max-w-[80px] truncate",
          !visited ? "text-muted-foreground" : "text-foreground"
        )}>
          {country.name}
        </span>
      )}
    </button>
  );
});

CountryBadge.displayName = 'CountryBadge';
