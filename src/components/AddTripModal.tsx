import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, CalendarDays, CalendarRange, Loader2, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { countries } from '@/data/countries';
import { toast } from 'sonner';

interface AddTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCountry?: string;
}

type WhenMode = 'now' | 'month' | 'dates';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = MONTHS[new Date().getMonth()];
const YEARS = Array.from({ length: 51 }, (_, i) => CURRENT_YEAR - i);
const TODAY = () => new Date().toISOString().split('T')[0];

export function AddTripModal({ open, onOpenChange, preselectedCountry }: AddTripModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Stage 1: log ─────────────────────────────────
  const [stage, setStage] = useState<'log' | 'enrich'>('log');
  const [country, setCountry] = useState(preselectedCountry ?? '');
  const [whenMode, setWhenMode] = useState<WhenMode>('month');
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR.toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(false);

  // ── Cities ────────────────────────────────────────
  const [cities, setCities] = useState('');

  // ── Stage 2: enrich ───────────────────────────────
  const [loggedCountryName, setLoggedCountryName] = useState('');
  const [note, setNote] = useState('');

  // Apply preselected country when modal opens
  useEffect(() => {
    if (open && preselectedCountry) setCountry(preselectedCountry);
  }, [open, preselectedCountry]);

  // Reset everything when modal closes
  useEffect(() => {
    if (!open) {
      setStage('log');
      setCountry(preselectedCountry ?? '');
      setWhenMode('month');
      setMonth(CURRENT_MONTH);
      setYear(CURRENT_YEAR.toString());
      setStartDate('');
      setEndDate('');
      setIsOngoing(false);
      setCities('');
      setLoggedCountryName('');
      setNote('');
    }
  }, [open]);

  // ── Validation ────────────────────────────────────
  const isLogValid = (() => {
    if (!country) return false;
    if (whenMode === 'now') return true;
    if (whenMode === 'month') return !!(month && year);
    if (whenMode === 'dates') return !!startDate;
    return false;
  })();

  // ── Stage 1 mutation: create visit ───────────────
  const logMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      let arrivalDate: string;
      let departureDate: string | null = null;
      let ongoing = false;

      if (whenMode === 'now') {
        arrivalDate = TODAY();
        ongoing = true;
      } else if (whenMode === 'month') {
        const monthIndex = MONTHS.indexOf(month);
        const yearNum = parseInt(year);
        arrivalDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        // Month mode is always a completed visit — close it on the last day of the month
        const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
        departureDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else {
        arrivalDate = startDate;
        departureDate = isOngoing ? null : (endDate || null);
        ongoing = isOngoing;
      }

      let tripId: string | null = null;
      if (ongoing) {
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .insert({ user_id: user.id, start_date: arrivalDate, end_date: null, source: 'manual', is_travel: true })
          .select('id')
          .single();
        if (tripError) throw tripError;
        tripId = tripData.id;
      }

      const { error: visitError } = await supabase.from('visits').insert({
        user_id: user.id,
        country_iso2: country,
        arrival_date: arrivalDate,
        departure_date: departureDate,
        source: 'manual',
        source_confidence: 'high',
        trip_id: tripId,
      });
      if (visitError) throw visitError;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      // Save any cities entered in Stage 1
      const cityList = cities.split(',').map(c => c.trim()).filter(Boolean);
      for (const cityName of cityList) {
        const { data: existing } = await supabase
          .from('places')
          .select('id')
          .eq('name', cityName)
          .eq('country_iso2', country)
          .maybeSingle();
        if (!existing) {
          await supabase.from('places').insert({ name: cityName, country_iso2: country, type: 'city' });
        }
      }
      const name = countries.find(c => c.iso2 === country)?.name || country;
      setLoggedCountryName(name);
      setStage('enrich');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to log visit'),
  });

  // ── Stage 2 mutation: save enrichment ────────────
  const enrichMutation = useMutation({
    mutationFn: async () => {
      if (!user || !note.trim()) return;
      await supabase.from('country_notes').upsert(
        { user_id: user.id, country_iso2: country, note: note.trim() },
        { onConflict: 'user_id,country_iso2' },
      );
      queryClient.invalidateQueries({ queryKey: ['country-notes'] });
    },
    onSuccess: () => onOpenChange(false),
    onError: (err: Error) => toast.error(err.message || 'Failed to save details'),
  });

  const hasEnrichment = note.trim();

  // ─────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">

        {/* ── STAGE 1: LOG ── */}
        {stage === 'log' && (
          <>
            <DialogHeader>
              <DialogTitle>Where have you been?</DialogTitle>
              <DialogDescription>Pick a country and roughly when you were there.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Country */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> Country
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search countries..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {countries.map(c => (
                      <SelectItem key={c.iso2} value={c.iso2}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cities */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Cities / Regions <span className="normal-case">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. Paris, Lyon, Nice"
                  value={cities}
                  onChange={e => setCities(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Separate multiple places with commas</p>
              </div>

              {/* When */}
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">When</Label>

                {/* Quick-pick tiles */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWhenMode('now')}
                    className={`when-tile ${whenMode === 'now' ? 'when-tile--active' : ''}`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Right now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhenMode('month')}
                    className={`when-tile ${whenMode === 'month' ? 'when-tile--active' : ''}`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>Month</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhenMode('dates')}
                    className={`when-tile ${whenMode === 'dates' ? 'when-tile--active' : ''}`}
                  >
                    <CalendarRange className="w-4 h-4" />
                    <span>Exact dates</span>
                  </button>
                </div>

                {/* Month/year selectors */}
                {whenMode === 'month' && (
                  <div className="flex gap-2">
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date range */}
                {whenMode === 'dates' && (
                  <div className="space-y-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={TODAY()} />
                      </div>
                      {!isOngoing && (
                        <>
                          <span className="text-muted-foreground pb-2.5">to</span>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">To (optional)</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} max={TODAY()} />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="ongoing"
                        checked={isOngoing}
                        onCheckedChange={v => { setIsOngoing(v === true); if (v) setEndDate(''); }}
                      />
                      <Label htmlFor="ongoing" className="text-sm text-muted-foreground cursor-pointer">
                        I'm still here
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => logMutation.mutate()} disabled={!isLogValid || logMutation.isPending} className="gap-2">
                {logMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Log Visit
              </Button>
            </div>
          </>
        )}

        {/* ── STAGE 2: ENRICH ── */}
        {stage === 'enrich' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                {loggedCountryName} logged
              </DialogTitle>
              <DialogDescription>Add a note about your time there (optional).</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note</Label>
                <Textarea
                  placeholder="A memory, highlight, or reminder..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{note.length}/500</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
              {hasEnrichment && (
                <Button onClick={() => enrichMutation.mutate()} disabled={enrichMutation.isPending} className="gap-2">
                  {enrichMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </Button>
              )}
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
