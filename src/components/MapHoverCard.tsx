import { MapPin, StickyNote, Image as ImageIcon, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCitiesByCountry } from "@/hooks/useCities";
import { useCountryImages } from "@/hooks/useCountryImages";
import { useCountryNote } from "@/hooks/useCountryNotes";
import { useVisitsByCountry } from "@/hooks/useVisits";

function isoToFlag(iso2: string): string {
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

interface MapHoverCardProps {
  countryIso2: string;
  countryName: string;
  x: number;
  y: number;
}

export function MapHoverCard({ countryIso2, countryName, x, y }: MapHoverCardProps) {
  const { data: cities = [], isLoading: citiesLoading } = useCitiesByCountry(countryIso2);
  const { data: note, isLoading: noteLoading } = useCountryNote(countryIso2);
  const { data: images = [], isLoading: imagesLoading } = useCountryImages(countryIso2);
  const { visitCount } = useVisitsByCountry(countryIso2);

  const isLoading = citiesLoading || noteLoading || imagesLoading;
  const hasCities = cities.length > 0;
  const hasNote = note?.note && note.note.trim().length > 0;
  const hasImages = images.length > 0;
  const hasContent = hasCities || hasNote || hasImages;

  // Calculate position to keep card within viewport
  // Position card to the right of cursor, or flip to left if near edge
  const cardWidth = 320;
  const cardHeight = 280; // approximate max height

  let adjustedX = x + 12;
  let adjustedY = y;
  let transformStyle = "translateY(-100%)";

  // If card would go off the right edge, position to the left of cursor
  // We use a rough estimate since we don't have container width
  if (x > 500) {
    adjustedX = x - cardWidth - 12;
  }

  // If card would go off the top, position below cursor instead
  if (y < cardHeight) {
    transformStyle = "translateY(10px)";
  }

  return (
    <div
      className="absolute z-[100] w-80 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg pointer-events-none"
      style={{
        left: adjustedX,
        top: adjustedY,
        transform: transformStyle,
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-semibold text-foreground">{isoToFlag(countryIso2)} {countryName}</h4>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {visitCount} {visitCount !== 1 ? "times" : "time"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : hasContent ? (
          <div className="space-y-3">
            {hasCities && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  Cities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cities.slice(0, 6).map((city) => (
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

            {hasNote && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StickyNote className="w-3 h-3" />
                  Notes
                </div>
                <p className="text-sm text-foreground line-clamp-2">{note?.note}</p>
              </div>
            )}

            {hasImages && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ImageIcon className="w-3 h-3" />
                  Photos ({images.length})
                </div>
                <div className="flex gap-1.5">
                  {images.slice(0, 3).map((image) => (
                    <div key={image.id} className="w-16 h-16 rounded-md overflow-hidden">
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
            No details added yet. Open the country to add cities, notes, and photos.
          </p>
        )}
      </div>
    </div>
  );
}
