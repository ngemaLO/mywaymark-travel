import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  parseGoogleTimelineJSON, 
  detectCountryVisits,
  DetectedCountryVisit,
  useImportGoogleTimeline 
} from '@/hooks/useGoogleTimelineImport';
import { 
  Upload, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  CheckCircle,
  Calendar,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GoogleTimelineImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'processing' | 'review' | 'result';

export function GoogleTimelineImportModal({ open, onOpenChange }: GoogleTimelineImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [detectedVisits, setDetectedVisits] = useState<DetectedCountryVisit[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [createTrips, setCreateTrips] = useState(true);
  const [importResult, setImportResult] = useState<{ 
    visitsCreated: number; 
    tripsCreated: number;
    skipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingVisit, setEditingVisit] = useState<string | null>(null);

  const importMutation = useImportGoogleTimeline();

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('upload');
      setDetectedVisits([]);
      setParseError(null);
      setCreateTrips(true);
      setImportResult(null);
      setEditingVisit(null);
    }, 300);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setParseError('Please select a JSON file');
      return;
    }

    setStep('processing');
    setParseError(null);

    // Use setTimeout to allow UI to update before parsing
    setTimeout(async () => {
      try {
        const text = await file.text();
        const { locations, error } = parseGoogleTimelineJSON(text);
        
        if (error) {
          setParseError(error);
          setStep('upload');
          return;
        }

        const visits = detectCountryVisits(locations);
        
        if (visits.length === 0) {
          setParseError('No country visits could be detected from your location history. This may happen if your visits were to countries not in our detection list.');
          setStep('upload');
          return;
        }

        setDetectedVisits(visits);
        setStep('review');
      } catch (e) {
        setParseError('Failed to read the file. Please try again.');
        setStep('upload');
      }
    }, 100);
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

  const toggleVisitIncluded = (id: string) => {
    setDetectedVisits(prev => 
      prev.map(v => v.id === id ? { ...v, included: !v.included } : v)
    );
  };

  const updateVisitDate = (id: string, field: 'firstSeen' | 'lastSeen', value: string) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return;

    setDetectedVisits(prev => 
      prev.map(v => v.id === id ? { ...v, [field]: date } : v)
    );
  };

  const handleImport = async () => {
    try {
      const result = await importMutation.mutateAsync({
        visits: detectedVisits,
        createTrips,
      });
      setImportResult(result);
      setStep('result');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const includedCount = detectedVisits.filter(v => v.included).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {step === 'upload' && 'Import Google Timeline'}
            {step === 'processing' && 'Processing...'}
            {step === 'review' && 'Review Detected Visits'}
            {step === 'result' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload your Google Location History JSON file from Google Takeout to automatically detect countries you've visited.
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
                accept=".json"
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
                    Drop JSON file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports Records.json or Semantic Location History
                  </p>
                </div>
              </div>
            </div>

            {/* Parse errors */}
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* How to get the file */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium text-foreground">How to get your Location History:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Takeout</a></li>
                <li>Select "Location History" (or "Timeline")</li>
                <li>Choose JSON format and create export</li>
                <li>Download and extract the ZIP file</li>
                <li>Upload the Records.json or Semantic Location History files</li>
              </ol>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-medium text-foreground">Processing your location history...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment for large files.
              </p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span>
                  <strong>{detectedVisits.length}</strong> countries detected
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {includedCount} selected
              </span>
            </div>

            {/* Visits list */}
            <ScrollArea className="h-[280px] rounded-lg border">
              <div className="p-2 space-y-2">
                {detectedVisits.map((visit) => (
                  <div 
                    key={visit.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      visit.included 
                        ? "bg-background border-border" 
                        : "bg-muted/30 border-transparent opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleVisitIncluded(visit.id)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs",
                            visit.included 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {visit.countryIso2}
                        </button>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {visit.countryName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {visit.locationCount} location points
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleVisitIncluded(visit.id)}
                        className={cn(
                          "p-1.5 rounded-md transition-colors shrink-0",
                          visit.included 
                            ? "text-destructive hover:bg-destructive/10" 
                            : "text-primary hover:bg-primary/10"
                        )}
                      >
                        {visit.included ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>

                    {visit.included && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {editingVisit === visit.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="date"
                              value={format(visit.firstSeen, 'yyyy-MM-dd')}
                              onChange={(e) => updateVisitDate(visit.id, 'firstSeen', e.target.value)}
                              className="h-7 text-xs w-[130px]"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="date"
                              value={format(visit.lastSeen, 'yyyy-MM-dd')}
                              onChange={(e) => updateVisitDate(visit.id, 'lastSeen', e.target.value)}
                              className="h-7 text-xs w-[130px]"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingVisit(null)}
                              className="h-7 px-2"
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingVisit(visit.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {format(visit.firstSeen, 'MMM d, yyyy')} — {format(visit.lastSeen, 'MMM d, yyyy')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Create trips toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium">Create inferred trips</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Group nearby visits into trips automatically
                </p>
              </div>
              <Switch
                checked={createTrips}
                onCheckedChange={setCreateTrips}
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
                disabled={includedCount === 0 || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Import {includedCount} Countries
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
                {importResult.visitsCreated} countries have been added to your travel map.
              </p>
              {importResult.tripsCreated > 0 && (
                <p className="text-sm text-primary">
                  + {importResult.tripsCreated} trips created
                </p>
              )}
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground">
                  {importResult.skipped} duplicates skipped
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
