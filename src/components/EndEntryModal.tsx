import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { getCountryByIso } from '@/data/countries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface EndEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryIso2: string;
  arrivalDate: string;
  onConfirm: (title?: string, memory?: string) => void;
  isPending?: boolean;
}

// Generate auto-suggested titles based on trip data
function generateTitleSuggestions(countryIso2: string, arrivalDate: string): string[] {
  const country = getCountryByIso(countryIso2);
  if (!country) return [];
  
  const arrival = new Date(arrivalDate);
  const today = new Date();
  const days = differenceInDays(today, arrival);
  const month = format(arrival, 'MMMM');
  const year = format(arrival, 'yyyy');
  
  const suggestions: string[] = [];
  
  // Time-based suggestions
  if (days <= 3) {
    suggestions.push(`A brief stop in ${country.name}`);
  } else if (days <= 7) {
    suggestions.push(`A week in ${country.name}`);
  } else if (days <= 14) {
    suggestions.push(`Two weeks in ${country.name}`);
  } else {
    suggestions.push(`${days} days in ${country.name}`);
  }
  
  // Season/month based
  suggestions.push(`${month} in ${country.name}`);
  
  // Simple location
  suggestions.push(`${country.name}, ${year}`);
  
  return suggestions.slice(0, 3);
}

export function EndEntryModal({
  open,
  onOpenChange,
  countryIso2,
  arrivalDate,
  onConfirm,
  isPending = false,
}: EndEntryModalProps) {
  const [title, setTitle] = useState('');
  const [memory, setMemory] = useState('');
  
  const suggestions = generateTitleSuggestions(countryIso2, arrivalDate);
  const country = getCountryByIso(countryIso2);
  
  const handleConfirm = () => {
    onConfirm(title.trim() || undefined, memory.trim() || undefined);
  };
  
  const handleClose = () => {
    setTitle('');
    setMemory('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="end-entry-modal">
        <DialogHeader>
          <DialogTitle className="end-entry-modal-title">
            Close this entry
          </DialogTitle>
        </DialogHeader>
        
        <div className="end-entry-modal-content">
          <p className="end-entry-modal-context">
            {country?.name} · Arrived {format(new Date(arrivalDate), 'MMMM d')}
          </p>
          
          {/* Title field with suggestions */}
          <div className="end-entry-field">
            <label className="end-entry-label">
              Name this entry <span className="end-entry-optional">(optional)</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank for just the date"
              className="end-entry-input"
            />
            
            {suggestions.length > 0 && (
              <div className="end-entry-suggestions">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    className="end-entry-suggestion"
                    onClick={() => setTitle(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Memory field */}
          <div className="end-entry-field">
            <label className="end-entry-label">
              One line you'll remember <span className="end-entry-optional">(optional)</span>
            </label>
            <Textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="A moment, a feeling, a detail..."
              className="end-entry-textarea"
              rows={2}
            />
          </div>
          
          {/* Actions */}
          <div className="end-entry-actions">
            <button
              type="button"
              className="end-entry-cancel"
              onClick={handleClose}
              disabled={isPending}
            >
              Keep writing
            </button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="end-entry-confirm"
            >
              {isPending ? 'Closing...' : 'Close entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
