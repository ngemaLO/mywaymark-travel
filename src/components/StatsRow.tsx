import { Globe, MapPin, Plane, Route } from 'lucide-react';
import { mockStats } from '@/data/mockData';

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

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard 
        icon={<Globe className="w-5 h-5" />}
        value={mockStats.countriesVisited}
        label="Countries"
        delay={0}
      />
      <StatCard 
        icon={<MapPin className="w-5 h-5" />}
        value={mockStats.citiesVisited}
        label="Cities"
        delay={100}
      />
      <StatCard 
        icon={<Route className="w-5 h-5" />}
        value={mockStats.totalTrips}
        label="Trips"
        delay={200}
      />
      <StatCard 
        icon={<Plane className="w-5 h-5" />}
        value={mockStats.totalFlights}
        label="Flights"
        delay={300}
      />
    </div>
  );
}
