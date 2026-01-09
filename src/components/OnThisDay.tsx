import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVisits } from '@/hooks/useVisits';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryByIso } from '@/data/countries';
import { supabase } from '@/integrations/supabase/client';
import { useHomeBases, isDateInHomeBase } from '@/hooks/useHomeBase';

export function OnThisDay() {
  const { user } = useAuth();
  const { data: visits = [], isLoading } = useVisits();
  const { data: homeBases = [] } = useHomeBases();

  // Fetch places to get city names
  const { data: places = [] } = useQuery({
    queryKey: ['places'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, type');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!user || isLoading) return null;
  if (visits.length === 0) return null;

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Find visits where today's day/month falls within the visit date range in previous years
  // Exclude visits that fall within a home base period
  const matchingVisits = visits.filter(visit => {
    const arrivalDate = new Date(visit.arrival_date);
    const visitYear = arrivalDate.getFullYear();
    
    // Must be from a previous year
    if (visitYear >= currentYear) return false;
    
    // Exclude if this visit was during a home base period
    if (isDateInHomeBase(visit.arrival_date, visit.country_iso2, homeBases)) {
      return false;
    }
    
    // Create a "this day in that year" date for comparison
    const thisDayThatYear = new Date(visitYear, todayMonth, todayDay);
    
    // Check if this day falls within the visit range
    const startDate = new Date(visit.arrival_date);
    const endDate = visit.departure_date ? new Date(visit.departure_date) : startDate;
    
    return thisDayThatYear >= startDate && thisDayThatYear <= endDate;
  });

  if (matchingVisits.length === 0) return null;

  // Sort by year descending and pick the most recent past year
  const sortedMatches = [...matchingVisits].sort((a, b) => 
    new Date(b.arrival_date).getFullYear() - new Date(a.arrival_date).getFullYear()
  );
  
  const memory = sortedMatches[0];
  const memoryDate = new Date(memory.arrival_date);
  const memoryYear = memoryDate.getFullYear();
  const yearDifference = currentYear - memoryYear;
  const country = getCountryByIso(memory.country_iso2);

  if (!country) return null;

  // Get city name if available
  const place = memory.place_id ? places.find(p => p.id === memory.place_id) : null;
  const cityName = place?.type === 'city' ? place.name : null;

  // Build location text
  const locationText = cityName ? `${cityName}, ${country.name}` : country.name;

  // Build the reflective copy
  const timePhrase = yearDifference === 1 
    ? 'A year ago today' 
    : `On this day in ${memoryYear}`;

  return (
    <section className="py-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{timePhrase}</span>
        {', you were travelling in '}
        <Link 
          to={`/country/${country.iso2}`} 
          className="text-foreground hover:underline underline-offset-2"
        >
          {locationText}
        </Link>
        .
      </p>
    </section>
  );
}
