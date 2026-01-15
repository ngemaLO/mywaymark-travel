import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useUpdateVisit } from '@/hooks/useVisitMutations';
import { getCountryByIso } from '@/data/countries';
import { format } from 'date-fns';

interface Visit {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
}

interface EditVisitModalProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get today's date in YYYY-MM-DD format for max date validation
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export function EditVisitModal({ visit, open, onOpenChange }: EditVisitModalProps) {
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [hasDeparture, setHasDeparture] = useState(false);
  
  const updateMutation = useUpdateVisit();
  const country = visit ? getCountryByIso(visit.country_iso2) : null;
  const today = getTodayString();

  useEffect(() => {
    if (visit && open) {
      setArrivalDate(visit.arrival_date);
      setDepartureDate(visit.departure_date || '');
      setHasDeparture(!!visit.departure_date);
    }
  }, [visit, open]);

  const handleSave = async () => {
    if (!visit || !arrivalDate) return;

    await updateMutation.mutateAsync({
      id: visit.id,
      arrival_date: arrivalDate,
      departure_date: hasDeparture && departureDate ? departureDate : null,
    });

    onOpenChange(false);
  };

  const isValid = arrivalDate && 
    arrivalDate <= today && 
    (!hasDeparture || (hasDeparture && departureDate && departureDate >= arrivalDate && departureDate <= today));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Entry: {country?.name || 'Unknown'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="arrival">Arrival Date</Label>
            <Input
              id="arrival"
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              max={today}
            />
            <p className="text-xs text-muted-foreground">Cannot be in the future</p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasDeparture"
              checked={hasDeparture}
              onCheckedChange={(checked) => setHasDeparture(checked === true)}
            />
            <Label htmlFor="hasDeparture" className="text-sm font-normal cursor-pointer">
              Add departure date
            </Label>
          </div>

          {hasDeparture && (
            <div className="space-y-2">
              <Label htmlFor="departure">Departure Date</Label>
              <Input
                id="departure"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={arrivalDate}
                max={today}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
