import { mockTrips } from '@/data/mockData';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function TimelinePreview() {
  const navigate = useNavigate();
  const recentTrips = mockTrips.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold text-foreground">Recent Trips</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/timeline')}
          className="text-muted-foreground hover:text-foreground"
        >
          View All <ChevronRight className="ml-1 w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-0">
        {recentTrips.map((trip, index) => {
          const visitCountries = [...new Set(trip.visits.map(v => v.countryIso2))];
          
          return (
            <div
              key={trip.id}
              className="timeline-item opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="timeline-dot" />
              
              <div className="card-elevated p-4 ml-2 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-foreground">
                      {trip.title || 'Untitled Trip'}
                    </h4>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {visitCountries.map(iso => getCountryByIso(iso)?.name).filter(Boolean).join(' → ')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Country badges */}
                  <div className="flex -space-x-2">
                    {visitCountries.slice(0, 3).map(iso => {
                      const country = getCountryByIso(iso);
                      return country ? (
                        <div
                          key={iso}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground border-2 border-background"
                        >
                          {country.iso2}
                        </div>
                      ) : null;
                    })}
                    {visitCountries.length > 3 && (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground border-2 border-background">
                        +{visitCountries.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
