import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MapPin, Building2, Calendar, FileText, Image, X, Loader2, Check, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DateEntry {
  id: string;
  dateType: 'month' | 'range';
  month: string;
  year: string;
  startDate: string;
  endDate: string;
}

// Generate months for selector
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years (last 50 years to now - no future years)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 51 }, (_, i) => currentYear - i);

// Get today's date in YYYY-MM-DD format for max date validation
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

const createEmptyDateEntry = (): DateEntry => ({
  id: crypto.randomUUID(),
  dateType: 'month',
  month: '',
  year: currentYear.toString(),
  startDate: '',
  endDate: '',
});

export function AddTripModal({ open, onOpenChange }: AddTripModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [includeCity, setIncludeCity] = useState(false);
  const [cityName, setCityName] = useState('');
  const [dateEntries, setDateEntries] = useState<DateEntry[]>([createEmptyDateEntry()]);
  const [note, setNote] = useState('');
  const [images, setImages] = useState<File[]>([]);
  
  // Fetch countries from database
  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCountry('');
      setIncludeCity(false);
      setCityName('');
      setDateEntries([createEmptyDateEntry()]);
      setNote('');
      setImages([]);
    }
  }, [open]);

  const updateDateEntry = (id: string, updates: Partial<DateEntry>) => {
    setDateEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
  };

  const addDateEntry = () => {
    setDateEntries(prev => [...prev, createEmptyDateEntry()]);
  };

  const removeDateEntry = (id: string) => {
    if (dateEntries.length > 1) {
      setDateEntries(prev => prev.filter(entry => entry.id !== id));
    }
  };

  const isDateEntryValid = (entry: DateEntry): boolean => {
    if (entry.dateType === 'month') {
      return !!(entry.month && entry.year);
    }
    return !!entry.startDate;
  };

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      if (!selectedCountry) throw new Error('Please select a country');

      const validEntries = dateEntries.filter(isDateEntryValid);
      if (validEntries.length === 0) throw new Error('Please add at least one valid date');

      // Create visits for each date entry - only include entries with proper dates
      const visits: Array<{
        user_id: string;
        country_iso2: string;
        arrival_date: string;
        departure_date: string | null;
        source: string;
        source_confidence: string;
      }> = [];

      for (const entry of validEntries) {
        let arrivalDate: string | null = null;
        let departureDate: string | null = null;

        if (entry.dateType === 'month' && entry.month && entry.year) {
          const monthIndex = months.indexOf(entry.month);
          if (monthIndex >= 0) {
            arrivalDate = `${entry.year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
          }
        } else if (entry.dateType === 'range' && entry.startDate) {
          arrivalDate = entry.startDate;
          departureDate = entry.endDate || null;
        }

        // Only add visit if we have a valid arrival date
        if (arrivalDate) {
          visits.push({
            user_id: user.id,
            country_iso2: selectedCountry,
            arrival_date: arrivalDate,
            departure_date: departureDate,
            source: 'manual',
            source_confidence: 'high',
          });
        }
      }

      if (visits.length === 0) {
        throw new Error('No valid dates provided');
      }

      // Insert all visits
      const { error: visitError } = await supabase
        .from('visits')
        .insert(visits);

      if (visitError) throw visitError;

      // If city is included, create a place entry if it doesn't exist
      if (includeCity && cityName.trim()) {
        const { data: existingPlace } = await supabase
          .from('places')
          .select('id')
          .eq('name', cityName.trim())
          .eq('country_iso2', selectedCountry)
          .maybeSingle();

        if (!existingPlace) {
          await supabase.from('places').insert({
            name: cityName.trim(),
            country_iso2: selectedCountry,
            type: 'city',
          });
        }
      }

      // If note provided, save it
      if (note.trim()) {
        await supabase.from('country_notes').upsert({
          user_id: user.id,
          country_iso2: selectedCountry,
          note: note.trim(),
        }, {
          onConflict: 'user_id,country_iso2',
        });
      }

      return visits;
    },
    onSuccess: () => {
      const countryName = countries.find(c => c.iso2 === selectedCountry)?.name || selectedCountry;
      const visitCount = dateEntries.filter(isDateEntryValid).length;
      toast.success(`Added ${visitCount} visit${visitCount > 1 ? 's' : ''} to ${countryName}!`);
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['country-notes'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add trip');
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (images.length + validFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    setImages(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const isValid = selectedCountry && dateEntries.some(isDateEntryValid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add a Trip
          </DialogTitle>
          <DialogDescription>
            Record a country you've visited. Add multiple dates for repeat visits.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Country Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="country-check" 
                  checked={!!selectedCountry}
                  disabled
                />
                <Label htmlFor="country-select" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Country <span className="text-destructive">*</span>
                </Label>
              </div>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger id="country-select">
                  <SelectValue placeholder="Select a country..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {countries.map(country => (
                      <SelectItem key={country.iso2} value={country.iso2}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* City (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="city-check" 
                  checked={includeCity}
                  onCheckedChange={(checked) => setIncludeCity(checked === true)}
                />
                <Label htmlFor="city-check" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  City (optional)
                </Label>
              </div>
              {includeCity && (
                <Input
                  placeholder="e.g., Paris, Tokyo, Cape Town..."
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Date Entries */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Label>When did you visit?</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDateEntry}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Date
                </Button>
              </div>
              
              <div className="space-y-4">
                {dateEntries.map((entry, index) => (
                  <div key={entry.id} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Visit {index + 1}
                      </span>
                      {dateEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDateEntry(entry.id)}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={entry.dateType === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateDateEntry(entry.id, { dateType: 'month' })}
                      >
                        Month/Year
                      </Button>
                      <Button
                        type="button"
                        variant={entry.dateType === 'range' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateDateEntry(entry.id, { dateType: 'range' })}
                      >
                        Date Range
                      </Button>
                    </div>

                    {entry.dateType === 'month' ? (
                      <div className="flex gap-2">
                        <Select 
                          value={entry.month} 
                          onValueChange={(value) => updateDateEntry(entry.id, { month: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={entry.year} 
                          onValueChange={(value) => updateDateEntry(entry.id, { year: value })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <ScrollArea className="h-[200px]">
                              {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Start</Label>
                          <Input
                            type="date"
                            value={entry.startDate}
                            onChange={(e) => updateDateEntry(entry.id, { startDate: e.target.value })}
                            max={getTodayString()}
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">to</span>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">End (optional)</Label>
                          <Input
                            type="date"
                            value={entry.endDate}
                            onChange={(e) => updateDateEntry(entry.id, { endDate: e.target.value })}
                            min={entry.startDate}
                            max={getTodayString()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Note (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Note (optional)
              </Label>
              <Textarea
                placeholder="A short memory, highlight, or reminder..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {note.length}/500
              </p>
            </div>

            {/* Images (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                Photos (optional, max 5)
              </Label>
              
              <div className="flex flex-wrap gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <label className={cn(
                    "w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer",
                    "hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  )}>
                    <Plus className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Image upload coming soon. Photos will be stored privately.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createTripMutation.mutate()}
            disabled={!isValid || createTripMutation.isPending}
            className="gap-2"
          >
            {createTripMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Add {dateEntries.filter(isDateEntryValid).length > 1 
              ? `${dateEntries.filter(isDateEntryValid).length} Visits` 
              : 'Trip'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}