import { Header } from '@/components/Header';
import { getCountryByIso } from '@/data/countries';
import { format, getYear } from 'date-fns';
import { Calendar, ChevronDown, Plane, Edit2, Loader2, Trash2, BookOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { EditVisitModal } from '@/components/EditVisitModal';
import { DeleteVisitDialog } from '@/components/DeleteVisitDialog';
import { ChapterFilter, type ChapterFilterValue } from '@/components/ChapterFilter';
import { useChapters, type Chapter } from '@/hooks/useChapters';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  source: string;
  trip_id: string | null;
}


export default function Timeline() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null);

  // Get chapter filter from URL
  const chapterParam = searchParams.get('chapter');
  const chapterFilter: ChapterFilterValue = chapterParam || 'all';

  const handleChapterChange = (value: ChapterFilterValue) => {
    if (value === 'all') {
      searchParams.delete('chapter');
    } else {
      searchParams.set('chapter', value);
    }
    setSearchParams(searchParams);
  };

  // Fetch chapters
  const { data: chapters = [] } = useChapters();

  // Determine current chapter if filter is 'current'
  const today = new Date().toISOString().split('T')[0];
  const currentChapter = chapters.find(c => 
    c.start_date <= today && (!c.end_date || c.end_date >= today)
  );

  const selectedChapter = chapterFilter === 'current' 
    ? currentChapter
    : chapterFilter !== 'all' 
      ? chapters.find(c => c.id === chapterFilter)
      : null;

  // Fetch visits from database
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['timeline-visits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .order('arrival_date', { ascending: false });
      
      if (error) throw error;
      return data as Visit[];
    },
    enabled: !!user,
  });

  // Filter visits based on chapter selection (by date range)
  const filteredVisits = useMemo(() => {
    if (!selectedChapter) return visits;
    // Show visits that overlap with the chapter's date range
    return visits.filter(v => {
      const visitStart = v.arrival_date;
      const visitEnd = v.departure_date || v.arrival_date;
      const chapterStart = selectedChapter.start_date;
      const chapterEnd = selectedChapter.end_date || today;
      // Overlap check: visit ends after chapter starts AND visit starts before chapter ends
      return visitEnd >= chapterStart && visitStart <= chapterEnd;
    });
  }, [visits, selectedChapter, today]);

  // Group visits by year - simple, clean timeline
  const groupedData = useMemo(() => {
    const visitsToGroup = chapterFilter !== 'all' ? filteredVisits : visits;
    
    const byYear = visitsToGroup.reduce((acc, visit) => {
      const year = getYear(new Date(visit.arrival_date));
      if (!acc[year]) acc[year] = [];
      acc[year].push(visit);
      return acc;
    }, {} as Record<number, Visit[]>);

    return {
      years: Object.keys(byYear).map(Number).sort((a, b) => b - a),
      byYear,
    };
  }, [chapterFilter, visits, filteredVisits]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view your timeline.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-8">
        {/* Page Header */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Your Timeline
              </h1>
              <p className="text-muted-foreground">
                {chapterFilter === 'all' 
                  ? 'Your story, one place at a time.'
                  : 'Entries from this chapter.'}
              </p>
            </div>
            <ChapterFilter value={chapterFilter} onChange={handleChapterChange} />
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">No entries yet.</p>
            <Button onClick={() => navigate('/')}>
              Add Your First Entry
            </Button>
          </div>
        ) : chapterFilter !== 'all' && filteredVisits.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No entries in this chapter yet.</p>
            <Button variant="outline" onClick={() => handleChapterChange('all')}>
              View All Time
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedData.years.map((year, yearIndex) => (
              <YearSection 
                key={year} 
                year={year} 
                visits={groupedData.byYear[year]}
                defaultOpen={yearIndex === 0}
                onCountryClick={(iso) => navigate(`/country/${iso}`)}
                onEditVisit={setEditingVisit}
                onDeleteVisit={setDeletingVisit}
              />
            ))}
          </div>
        )}
      </main>

      <EditVisitModal
        visit={editingVisit}
        open={!!editingVisit}
        onOpenChange={(open) => !open && setEditingVisit(null)}
      />

      <DeleteVisitDialog
        visit={deletingVisit}
        open={!!deletingVisit}
        onOpenChange={(open) => !open && setDeletingVisit(null)}
      />
    </div>
  );
}


interface YearSectionProps {
  year: number;
  visits: Visit[];
  defaultOpen?: boolean;
  onCountryClick: (iso: string) => void;
  onEditVisit: (visit: Visit) => void;
  onDeleteVisit: (visit: Visit) => void;
  nested?: boolean;
}

function YearSection({ year, visits, defaultOpen = false, onCountryClick, onEditVisit, onDeleteVisit, nested = false }: YearSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const uniqueCountries = [...new Set(visits.map(v => v.country_iso2))].length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full flex items-center justify-between p-4 rounded-xl transition-colors group",
          nested 
            ? "bg-card/50 border border-border/30 hover:bg-card" 
            : "bg-card border border-border/50 hover:bg-muted/50"
        )}>
          <div className="flex items-center gap-4">
            <span className={cn(
              "font-display font-bold text-foreground",
              nested ? "text-2xl" : "text-3xl"
            )}>
              {year}
            </span>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{visits.length} entr{visits.length !== 1 ? 'ies' : 'y'}</span>
              <span>•</span>
              <span>{uniqueCountries} countr{uniqueCountries !== 1 ? 'ies' : 'y'}</span>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="pt-4 space-y-4 pl-4 border-l-2 border-border ml-6">
          {visits.map((visit, index) => (
            <VisitCard 
              key={visit.id} 
              visit={visit} 
              index={index}
              onCountryClick={onCountryClick}
              onEdit={() => onEditVisit(visit)}
              onDelete={() => onDeleteVisit(visit)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface VisitCardProps {
  visit: Visit;
  index: number;
  onCountryClick: (iso: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function VisitCard({ visit, index, onCountryClick, onEdit, onDelete }: VisitCardProps) {
  const country = getCountryByIso(visit.country_iso2);
  if (!country) return null;
  
  return (
    <div 
      className="relative opacity-0 animate-fade-in group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Timeline dot */}
      <div className="absolute -left-[calc(1rem+5px)] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
      
      <div className="w-full card-elevated p-5 space-y-2 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onCountryClick(visit.country_iso2)}
            className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold hover:opacity-90 transition-opacity"
          >
            {country.iso2}
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onCountryClick(visit.country_iso2)}
              className="text-lg font-semibold text-foreground truncate hover:text-primary transition-colors text-left"
            >
              {country.name}
            </button>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {visit.departure_date 
                    ? `${format(new Date(visit.arrival_date), 'MMM d, yyyy')} - ${format(new Date(visit.departure_date), 'MMM d, yyyy')}`
                    : format(new Date(visit.arrival_date), 'MMM d, yyyy')
                  }
                </span>
              </div>
              
              {visit.source === 'flight' && (
                <div className="flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Via flight</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
