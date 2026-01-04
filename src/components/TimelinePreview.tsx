import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';
import { Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
}

export function TimelinePreview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['recent-visits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Recent Trips
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="card-elevated p-6">
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Recent Trips
        </h2>
        <p className="text-sm text-muted-foreground text-center py-4">
          No trips yet. Add your first trip to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 space-y-4">
      <h2 className="text-xl font-display font-semibold text-foreground">
        Recent Trips
      </h2>
      
      <div className="space-y-3">
        {visits.map((visit) => {
          const country = getCountryByIso(visit.country_iso2);
          if (!country) return null;
          
          return (
            <button
              key={visit.id}
              onClick={() => navigate(`/country/${visit.country_iso2}`)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                {country.iso2}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {country.name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(visit.arrival_date), 'MMM yyyy')}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Button 
        variant="ghost" 
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/timeline')}
      >
        View Full Timeline
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
