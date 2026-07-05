import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateItinerary } from '@/hooks/useItineraries';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STYLES = ['Adventure', 'Culture', 'Food & Drink', 'Relaxation', 'Mixed'];
const BUDGETS = ['Budget', 'Mid-range', 'Luxury'];
const GROUPS = ['Solo', 'Couple', 'Family', 'Friends'];
const PACES = ['Relaxed', 'Balanced', 'Packed'];

function ChipGroup({
  label,
  options,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
}) {
  const isSelected = (opt: string) =>
    Array.isArray(value) ? value.includes(opt) : value === opt;

  const toggle = (opt: string) => {
    if (multiple && Array.isArray(value)) {
      onChange(isSelected(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    } else {
      onChange(isSelected(opt) ? '' : opt);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {multiple && <span className="text-xs text-muted-foreground">Select all that apply</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm border transition-colors',
              isSelected(opt)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PlanNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createItinerary = useCreateItinerary();

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [group, setGroup] = useState('');
  const [pace, setPace] = useState('');

  if (!user) return <Navigate to="/auth" replace />;

  const isValid = destination.trim() && startDate && endDate && endDate >= startDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const itinerary = await createItinerary.mutateAsync({
      destination: destination.trim(),
      startDate,
      endDate,
      preferences: {
        style: styles.length > 0 ? styles : undefined,
        budget: budget || undefined,
        group: group || undefined,
        pace: (pace.toLowerCase() as 'relaxed' | 'balanced' | 'packed') || undefined,
      },
    });
    navigate(`/plan/${itinerary.id}`);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <main className="container py-8 max-w-lg space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plan')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">New Plan</h1>
            <p className="text-sm text-muted-foreground">Where are you headed?</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              placeholder="e.g. Tokyo, Japan"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Departure</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Return</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Help the AI tailor your plan <span className="text-muted-foreground/60">(optional)</span>
            </p>
            <ChipGroup label="Travel style" options={STYLES} value={styles} onChange={(v) => setStyles(v as string[])} multiple />
            <ChipGroup label="Daily pace" options={PACES} value={pace} onChange={setPace} />
            <ChipGroup label="Accommodation budget" options={BUDGETS} value={budget} onChange={setBudget} />
            <ChipGroup label="Travelling as" options={GROUPS} value={group} onChange={setGroup} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || createItinerary.isPending}
          >
            {createItinerary.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Plan'
            )}
          </Button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
