import { QRCodeSVG } from 'qrcode.react';
import { useConnectionCode, useGenerateConnectionCode } from '@/hooks/useTripConnections';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, RefreshCw, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface QRCodeDisplayProps {
  tripId: string;
}

export function QRCodeDisplay({ tripId }: QRCodeDisplayProps) {
  const { data: codeData, isLoading } = useConnectionCode(tripId);
  const generateCode = useGenerateConnectionCode();

  const handleGenerate = () => {
    generateCode.mutate(tripId);
  };

  const handleCopyCode = () => {
    if (codeData?.code) {
      navigator.clipboard.writeText(codeData.code);
      toast.success('Code copied!');
    }
  };

  // Generate the QR value - this will be the full URL with token
  const qrValue = codeData?.token 
    ? `${window.location.origin}/connect?token=${codeData.token}` 
    : '';

  if (isLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Skeleton className="w-48 h-48 rounded-lg" />
          <Skeleton className="w-24 h-8" />
        </CardContent>
      </Card>
    );
  }

  if (!codeData) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center">
            <QrCode className="w-16 h-16 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Generate a QR code to connect with fellow travelers
          </p>
          <Button onClick={handleGenerate} disabled={generateCode.isPending}>
            {generateCode.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate QR Code'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-6 flex flex-col items-center gap-4">
        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG 
            value={qrValue} 
            size={180}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Short Code */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Or share this code
          </p>
          <div className="flex items-center gap-2">
            <code className="text-2xl font-mono font-bold tracking-widest text-foreground bg-muted/50 px-4 py-2 rounded-lg">
              {codeData.code}
            </code>
            <Button variant="ghost" size="icon" onClick={handleCopyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Regenerate */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleGenerate}
          disabled={generateCode.isPending}
          className="text-muted-foreground"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Generate new code
        </Button>
      </CardContent>
    </Card>
  );
}
