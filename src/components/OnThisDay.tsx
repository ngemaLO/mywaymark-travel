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
  const matchingVisits = visits.filter(visit => {
    const arrivalDate = new Date(visit.arrival_date);
    const visitYear = arrivalDate.getFullYear();
    
    if (visitYear >= currentYear) return false;
    
    if (isDateInHomeBase(visit.arrival_date, visit.country_iso2, homeBases)) {
      return false;
    }
    
    const thisDayThatYear = new Date(visitYear, todayMonth, todayDay);
    const startDate = new Date(visit.arrival_date);
    const endDate = visit.departure_date ? new Date(visit.departure_date) : startDate;
    
    return thisDayThatYear >= startDate && thisDayThatYear <= endDate;
  });

  if (matchingVisits.length === 0) return null;

  const sortedMatches = [...matchingVisits].sort((a, b) => 
    new Date(b.arrival_date).getFullYear() - new Date(a.arrival_date).getFullYear()
  );
  
  const memory = sortedMatches[0];
  const memoryYear = new Date(memory.arrival_date).getFullYear();
  const country = getCountryByIso(memory.country_iso2);

  if (!country) return null;

  const place = memory.place_id ? places.find(p => p.id === memory.place_id) : null;
  const cityName = place?.type === 'city' ? place.name : null;
  const locationText = cityName ? `${cityName}, ${country.name}` : country.name;

  const yearsAgo = currentYear - memoryYear;

  return (
    <aside className="journal-memory">
      <p className="journal-memory-text">
        {yearsAgo === 1 ? 'A year ago' : `${yearsAgo} years ago`} today, you were in{' '}
        <em>{locationText}</em>.
      </p>
    </aside>
  );
}
