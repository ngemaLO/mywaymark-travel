import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useCitiesByCountry } from '@/hooks/useCities';
import { useCountryNote } from '@/hooks/useCountryNotes';
import { useCountryImages } from '@/hooks/useCountryImages';
import { useVisitsByCountry } from '@/hooks/useVisits';
import { MapPin, StickyNote, Image, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CountryHoverCardProps {
  countryIso2: string;
  countryName: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function CountryHoverCard({ 
  countryIso2, 
  countryName, 
  children,
  enabled = true 
}: CountryHoverCardProps) {
  const { data: cities = [], isLoading: citiesLoading } = useCitiesByCountry(countryIso2);
  const { data: note, isLoading: noteLoading } = useCountryNote(countryIso2);
  const { data: images = [], isLoading: imagesLoading } = useCountryImages(countryIso2);
  const { visitCount } = useVisitsByCountry(countryIso2);

  if (!enabled) {
    return <>{children}</>;
  }

  const isLoading = citiesLoading || noteLoading || imagesLoading;
  const hasCities = cities.length > 0;
  const hasNote = note?.note && note.note.trim().length > 0;
  const hasImages = images.length > 0;
  const hasContent = hasCities || hasNote || hasImages;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-4 z-50 bg-popover border-border shadow-lg"
        side="top"
        align="center"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-foreground">{countryName}</h4>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {visitCount} visit{visitCount !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : hasContent ? (
            <div className="space-y-3">
              {/* Cities */}
              {hasCities && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    Cities visited
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cities.slice(0, 6).map(city => (
                      <span 
                        key={city.id}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                      >
                        {city.name}
                      </span>
                    ))}
                    {cities.length > 6 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                        +{cities.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Note preview */}
              {hasNote && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <StickyNote className="w-3 h-3" />
                    Notes
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {note?.note}
                  </p>
                </div>
              )}

              {/* Images preview */}
              {hasImages && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Image className="w-3 h-3" />
                    Photos ({images.length})
                  </div>
                  <div className="flex gap-1.5">
                    {images.slice(0, 3).map(image => (
                      <div 
                        key={image.id}
                        className="w-16 h-16 rounded-md overflow-hidden"
                      >
                        <img
                          src={image.image_url}
                          alt={`Photo from ${countryName}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {images.length > 3 && (
                      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">+{images.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No details added yet. Click to add cities, notes, and photos.
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
