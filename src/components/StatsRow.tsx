import { Globe } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/contexts/AuthContext';

export function StatsRow() {
  const { data: stats } = useStats();
  const { user } = useAuth();

  if (!user) return null;

  const count = stats?.countriesVisited ?? 0;

  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground">
      <Globe className="w-4 h-4" />
      <span className="text-sm">
        <span className="font-semibold text-foreground">{count}</span>
        {' '}
        {count === 1 ? 'country' : 'countries'} explored
      </span>
    </div>
  );
}