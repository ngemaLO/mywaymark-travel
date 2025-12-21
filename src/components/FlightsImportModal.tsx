import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  parseFlightsCSV, 
  ParsedFlight, 
  useImportFlights 
} from '@/hooks/useFlightsImport';
import { 
  Upload, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  Plane,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface FlightsImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'preview' | 'result';

export function FlightsImportModal({ open, onOpenChange }: FlightsImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [parsedFlights, setParsedFlights] = useState<ParsedFlight[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [autoCreateVisits, setAutoCreateVisits] = useState(true);
  const [importResult, setImportResult] = useState<{ flightsImported: number; visitsCreated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const importMutation = useImportFlights();

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('upload');
      setParsedFlights([]);
      setParseErrors([]);
      setAutoCreateVisits(true);
      setImportResult(null);
    }, 300);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseErrors(['Please select a CSV file']);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { flights, errors } = parseFlightsCSV(text);
      
      setParsedFlights(flights);
      setParseErrors(errors);
      
      if (errors.length === 0 && flights.length > 0) {
        setStep('preview');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = async () => {
    const validFlights = parsedFlights.filter(f => f.isValid);
    
    try {
      const result = await importMutation.mutateAsync({
        flights: validFlights.map(({ id, isValid, errors, ...flight }) => flight),
        autoCreateVisits,
      });
      setImportResult(result);
      setStep('result');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const validFlights = parsedFlights.filter(f => f.isValid);
  const invalidFlights = parsedFlights.filter(f => !f.isValid);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            {step === 'upload' && 'Import Flights'}
            {step === 'preview' && 'Preview Import'}
            {step === 'result' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with your flight history. Required columns: date, from_airport, to_airport.
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Drop CSV file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports common flight export formats
                  </p>
                </div>
              </div>
            </div>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {parseErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Expected format help */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium text-foreground">Expected CSV format:</p>
              <code className="text-xs text-muted-foreground block">
                date,from_airport,to_airport,to_country,airline,flight_number<br/>
                2024-03-15,JFK,LHR,GB,BA,178<br/>
                2024-03-22,LHR,CDG,FR,AF,1081
              </code>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span><strong>{validFlights.length}</strong> valid flights</span>
              </div>
              {invalidFlights.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <X className="w-4 h-4" />
                  <span><strong>{invalidFlights.length}</strong> with errors</span>
                </div>
              )}
            </div>

            {/* Flights preview */}
            <ScrollArea className="h-[250px] rounded-lg border">
              <div className="p-2 space-y-1">
                {parsedFlights.map((flight, index) => (
                  <div 
                    key={flight.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg text-sm",
                      flight.isValid ? "bg-background" : "bg-destructive/5"
                    )}
                  >
                    <span className="w-6 text-muted-foreground text-xs">
                      {index + 1}
                    </span>
                    {flight.isValid ? (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {flight.from_airport} → {flight.to_airport}
                        </span>
                        {flight.flight_date && (
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(flight.flight_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      {!flight.isValid && (
                        <p className="text-xs text-destructive">{flight.errors.join(', ')}</p>
                      )}
                    </div>
                    {flight.to_country_iso2 && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {flight.to_country_iso2}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Auto-create visits toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium">Auto-create country visits</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add destination countries to your visited countries list
                </p>
              </div>
              <Switch
                checked={autoCreateVisits}
                onCheckedChange={setAutoCreateVisits}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep('upload')} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={validFlights.length === 0 || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Import {validFlights.length} Flights
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-display font-semibold text-foreground">
                Import Successful!
              </h3>
              <p className="text-muted-foreground">
                {importResult.flightsImported} flights have been added to your travel log.
              </p>
              {importResult.visitsCreated > 0 && (
                <p className="text-sm text-primary">
                  + {importResult.visitsCreated} new countries added to your map
                </p>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
