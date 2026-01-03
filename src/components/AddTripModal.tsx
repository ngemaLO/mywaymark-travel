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
import { Plus, MapPin, Building2, Calendar, FileText, Image, X, Loader2, Check } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate months for selector
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years (last 50 years to now)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 51 }, (_, i) => currentYear - i);

export function AddTripModal({ open, onOpenChange }: AddTripModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [includeCity, setIncludeCity] = useState(false);
  const [cityName, setCityName] = useState('');
  const [dateType, setDateType] = useState<'month' | 'range'>('month');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>(currentYear.toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
      setDateType('month');
      setMonth('');
      setYear(currentYear.toString());
      setStartDate('');
      setEndDate('');
      setNote('');
      setImages([]);
    }
  }, [open]);

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      if (!selectedCountry) throw new Error('Please select a country');

      // Calculate arrival date
      let arrivalDate: string;
      let departureDate: string | null = null;

      if (dateType === 'month' && month && year) {
        // First day of selected month
        const monthIndex = months.indexOf(month);
        arrivalDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      } else if (dateType === 'range' && startDate) {
        arrivalDate = startDate;
        departureDate = endDate || null;
      } else {
        // Default to today
        arrivalDate = new Date().toISOString().split('T')[0];
      }

      // Create the visit with source=manual
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          user_id: user.id,
          country_iso2: selectedCountry,
          arrival_date: arrivalDate,
          departure_date: departureDate,
          source: 'manual',
          source_confidence: 'high',
        })
        .select()
        .single();

      if (visitError) throw visitError;

      // If city is included, create a place entry if it doesn't exist
      if (includeCity && cityName.trim()) {
        // Check if place already exists
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

      // TODO: Handle image uploads when storage is set up
      // For now, we'll skip image upload functionality

      return visit;
    },
    onSuccess: () => {
      const countryName = countries.find(c => c.iso2 === selectedCountry)?.name || selectedCountry;
      toast.success(`Added trip to ${countryName}!`);
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

  const isValid = selectedCountry && (
    (dateType === 'month' && month && year) ||
    (dateType === 'range' && startDate)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add a Trip
          </DialogTitle>
          <DialogDescription>
            Record a country you've visited.
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

            {/* Date Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <Label>When did you visit?</Label>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={dateType === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateType('month')}
                >
                  Month/Year
                </Button>
                <Button
                  type="button"
                  variant={dateType === 'range' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateType('range')}
                >
                  Date Range
                </Button>
              </div>

              {dateType === 'month' ? (
                <div className="flex gap-2">
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={year} onValueChange={setYear}>
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
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">to</span>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">End (optional)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
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
            Add Trip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
