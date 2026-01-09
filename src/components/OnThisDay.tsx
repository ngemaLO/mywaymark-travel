import { Link } from 'react-router-dom';
import { useVisits } from '@/hooks/useVisits';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryByIso } from '@/data/countries';

export function OnThisDay() {
  const { user } = useAuth();
  const { data: visits = [], isLoading } = useVisits();

  if (!user || isLoading) return null;
  if (visits.length === 0) return null;

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Find visits that match today's day and month from previous years
  const matchingVisits = visits.filter(visit => {
    const arrivalDate = new Date(visit.arrival_date);
    const visitYear = arrivalDate.getFullYear();
    
    // Must be from a previous year
    if (visitYear >= currentYear) return false;
    
    // Check if day and month match
    return arrivalDate.getDate() === todayDay && arrivalDate.getMonth() === todayMonth;
  });

  if (matchingVisits.length === 0) return null;

  // Sort by year descending and pick the most recent past year
  const sortedMatches = [...matchingVisits].sort((a, b) => 
    new Date(b.arrival_date).getFullYear() - new Date(a.arrival_date).getFullYear()
  );
  
  const memory = sortedMatches[0];
  const memoryDate = new Date(memory.arrival_date);
  const memoryYear = memoryDate.getFullYear();
  const country = getCountryByIso(memory.country_iso2);

  if (!country) return null;

  return (
    <section className="py-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">On this day</span>
        {' '}in {memoryYear}, you were in{' '}
        <Link 
          to={`/country/${country.iso2}`} 
          className="text-foreground hover:underline underline-offset-2"
        >
          {country.name}
        </Link>
        .
      </p>
    </section>
  );
}
