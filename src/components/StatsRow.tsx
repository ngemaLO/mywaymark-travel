import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/contexts/AuthContext';

export function StatsRow() {
  const { data: stats } = useStats();
  const { user } = useAuth();

  if (!user) return null;

  const count = stats?.countriesVisited ?? 0;

  return (
    <div className="flex items-center justify-center">
      <p className="text-sm text-muted-foreground/60">
        <span className="text-foreground/80 font-medium">{count}</span>
        {' '}
        {count === 1 ? 'country' : 'countries'} explored
      </p>
    </div>
  );
}