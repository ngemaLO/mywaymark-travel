import { Link } from 'react-router-dom';
import { Globe, MapPin, BookOpen, ChevronRight } from 'lucide-react';
import { useVisitedCountries } from '@/hooks/useVisits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChapters } from '@/hooks/useChapters';

interface ArchiveCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  label: string;
  to: string;
}

function ArchiveCard({ icon, title, count, label, to }: ArchiveCardProps) {
  return (
    <Link 
      to={to}
      className="archive-entry-card group"
    >
      <div className="flex items-center gap-3">
        <div className="archive-entry-icon">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground/60">
            {count} {label}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
      </div>
    </Link>
  );
}

export function ArchiveEntryPoints() {
  const { user } = useAuth();
  const { visitedIsos } = useVisitedCountries();
  const { data: chapters = [] } = useChapters();

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
  const chaptersCount = chapters.length;

  return (
    <div className="archive-entry-grid">
      <ArchiveCard
        icon={<Globe className="w-4 h-4" />}
        title="Countries"
        count={countriesCount}
        label={countriesCount === 1 ? 'country' : 'countries'}
        to="/timeline"
      />
      <ArchiveCard
        icon={<MapPin className="w-4 h-4" />}
        title="Cities"
        count={citiesCount}
        label={citiesCount === 1 ? 'explored' : 'explored'}
        to="/timeline"
      />
      <ArchiveCard
        icon={<BookOpen className="w-4 h-4" />}
        title="Chapters"
        count={chaptersCount}
        label={chaptersCount === 1 ? 'chapter' : 'chapters'}
        to="/travels"
      />
    </div>
  );
}
