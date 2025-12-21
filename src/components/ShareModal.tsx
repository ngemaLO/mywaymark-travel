import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateShareLink, CreateShareLinkData } from '@/hooks/useShareLinks';
import { 
  Map, 
  BarChart3, 
  Clock, 
  Award, 
  FileText, 
  Image,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'scopes' | 'details' | 'result';

const scopeOptions = [
  { key: 'scope_map', label: 'World Map', description: 'Show visited countries on the map', icon: Map },
  { key: 'scope_stats', label: 'Statistics', description: 'Display travel statistics', icon: BarChart3 },
  { key: 'scope_badges', label: 'Country Badges', description: 'Show country collection', icon: Award },
  { key: 'scope_timeline', label: 'Timeline', description: 'Share trip history', icon: Clock },
  { key: 'scope_notes', label: 'Notes', description: 'Include personal notes', icon: FileText },
  { key: 'scope_images', label: 'Photos', description: 'Display uploaded photos', icon: Image },
] as const;

const expiryOptions = [
  { value: 'never', label: 'Never' },
  { value: '7days', label: '7 days' },
  { value: '30days', label: '30 days' },
  { value: '90days', label: '90 days' },
];

export function ShareModal({ open, onOpenChange }: ShareModalProps) {
  const [step, setStep] = useState<Step>('scopes');
  const [scopes, setScopes] = useState({
    scope_map: true,
    scope_stats: true,
    scope_badges: true,
    scope_timeline: false,
    scope_notes: true,
    scope_images: true,
  });
  const [detailLevel, setDetailLevel] = useState<'overview' | 'detailed'>('overview');
  const [expiry, setExpiry] = useState('never');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateShareLink();

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep('scopes');
      setScopes({
        scope_map: true,
        scope_stats: true,
        scope_badges: true,
        scope_timeline: false,
        scope_notes: true,
        scope_images: true,
      });
      setDetailLevel('overview');
      setExpiry('never');
      setGeneratedLink(null);
      setCopied(false);
    }, 300);
  };

  const handleScopeToggle = (key: keyof typeof scopes) => {
    setScopes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateExpiryDate = (): string | null => {
    if (expiry === 'never') return null;
    const days = parseInt(expiry);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const handleGenerate = async () => {
    const expiresAt = calculateExpiryDate();
    
    const data: CreateShareLinkData = {
      ...scopes,
      detail_level: detailLevel,
      expires_at: expiresAt,
    };

    try {
      const result = await createMutation.mutateAsync(data);
      const shareUrl = `${window.location.origin}/share/${result.token}`;
      setGeneratedLink(shareUrl);
      setStep('result');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const atLeastOneScopeEnabled = Object.values(scopes).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            {step === 'scopes' && 'Choose What to Share'}
            {step === 'details' && 'Link Settings'}
            {step === 'result' && 'Your Share Link'}
          </DialogTitle>
        </DialogHeader>

        {step === 'scopes' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which parts of your travel profile to include in the shared view.
            </p>
            
            <div className="space-y-3">
              {scopeOptions.map(({ key, label, description, icon: Icon }) => (
                <div 
                  key={key}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    scopes[key] ? "border-primary/50 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      scopes[key] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <Label className="font-medium cursor-pointer">{label}</Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={scopes[key]}
                    onCheckedChange={() => handleScopeToggle(key)}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setStep('details')}
                disabled={!atLeastOneScopeEnabled}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6">
            {/* Detail Level */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Detail Level</Label>
              <RadioGroup value={detailLevel} onValueChange={(v) => setDetailLevel(v as 'overview' | 'detailed')}>
                <div className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer",
                  detailLevel === 'overview' ? "border-primary/50 bg-primary/5" : "border-border"
                )}>
                  <RadioGroupItem value="overview" id="overview" />
                  <div className="flex-1">
                    <Label htmlFor="overview" className="font-medium cursor-pointer">Overview</Label>
                    <p className="text-xs text-muted-foreground">Summary view with key highlights</p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer",
                  detailLevel === 'detailed' ? "border-primary/50 bg-primary/5" : "border-border"
                )}>
                  <RadioGroupItem value="detailed" id="detailed" />
                  <div className="flex-1">
                    <Label htmlFor="detailed" className="font-medium cursor-pointer">Detailed</Label>
                    <p className="text-xs text-muted-foreground">Full information including dates</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Expiry */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Link Expiry</Label>
              <RadioGroup value={expiry} onValueChange={setExpiry} className="grid grid-cols-2 gap-2">
                {expiryOptions.map(option => (
                  <div 
                    key={option.value}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-lg border cursor-pointer text-sm",
                      expiry === option.value ? "border-primary/50 bg-primary/5" : "border-border"
                    )}
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                    <Label htmlFor={option.value} className="cursor-pointer">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep('scopes')} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
                Generate Link
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && generatedLink && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your share link is ready. Copy it and share with anyone!
              </p>
              
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="text-sm"
                />
                <Button onClick={handleCopy} variant="outline" className="shrink-0">
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p><strong>Sharing:</strong> {Object.entries(scopes).filter(([, v]) => v).map(([k]) => 
                  scopeOptions.find(o => o.key === k)?.label
                ).join(', ')}</p>
                <p><strong>Detail:</strong> {detailLevel === 'overview' ? 'Overview' : 'Detailed'}</p>
                <p><strong>Expires:</strong> {expiry === 'never' ? 'Never' : expiry.replace('days', ' days')}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
