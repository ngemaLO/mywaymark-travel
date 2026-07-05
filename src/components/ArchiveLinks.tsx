import { Link } from 'react-router-dom';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function ArchiveLinks() {
  const { user } = useAuth();
  const { visitedIsos } = useVisitedCountries();

  // Get unique cities count
  const { data: citiesCount = 0 } = useQuery({
    queryKey: ['cities-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('user_places')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const countriesCount = visitedIsos.length;

  return (
    <nav className="archive-links">
      <Link to="/stats" className="archive-link">
        {countriesCount} {countriesCount === 1 ? 'country' : 'countries'}
      </Link>
      <span className="archive-separator">·</span>
      <Link to="/stats" className="archive-link">
        {citiesCount} {citiesCount === 1 ? 'city' : 'cities'}
      </Link>
    </nav>
  );
}
