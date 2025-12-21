import { Globe, MapPin, Plane, Route } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  delay?: number;
}

function StatCard({ icon, value, label, delay = 0 }: StatCardProps) {
  return (
    <div 
      className="stat-card opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-2">
        {icon}
      </div>
      <span className="text-2xl font-display font-bold text-foreground">
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="w-10 h-10 rounded-lg mb-2" />
      <Skeleton className="w-12 h-8 mb-1" />
      <Skeleton className="w-16 h-4" />
    </div>
  );
}

export function StatsRow() {
  const { data: stats, isLoading } = useStats();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat-card text-center text-muted-foreground">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-2 mx-auto">
              {i === 0 && <Globe className="w-5 h-5" />}
              {i === 1 && <MapPin className="w-5 h-5" />}
              {i === 2 && <Route className="w-5 h-5" />}
              {i === 3 && <Plane className="w-5 h-5" />}
            </div>
            <span className="text-2xl font-display font-bold">0</span>
            <span className="text-sm">{['Countries', 'Cities', 'Trips', 'Flights'][i]}</span>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard 
        icon={<Globe className="w-5 h-5" />}
        value={stats?.countriesVisited ?? 0}
        label="Countries"
        delay={0}
      />
      <StatCard 
        icon={<MapPin className="w-5 h-5" />}
        value={stats?.citiesVisited ?? 0}
        label="Cities"
        delay={100}
      />
      <StatCard 
        icon={<Route className="w-5 h-5" />}
        value={stats?.totalTrips ?? 0}
        label="Trips"
        delay={200}
      />
      <StatCard 
        icon={<Plane className="w-5 h-5" />}
        value={stats?.totalFlights ?? 0}
        label="Flights"
        delay={300}
      />
    </div>
  );
}
