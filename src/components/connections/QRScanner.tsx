import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Keyboard, Loader2, AlertCircle } from 'lucide-react';
import { useLookupCode } from '@/hooks/useTripConnections';

interface QRScannerProps {
  onCodeScanned: (codeData: any) => void;
  onCancel: () => void;
}

export function QRScanner({ onCodeScanned, onCancel }: QRScannerProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lookupCode = useLookupCode();

  useEffect(() => {
    if (activeTab === 'scan') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [activeTab]);

  const startScanner = async () => {
    if (!containerRef.current) return;

    setScannerError(null);
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleQRCode(decodedText);
        },
        () => {
          // QR not detected - do nothing
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
        setScannerError('Camera access denied. Please enable camera permissions or use manual entry.');
      } else if (err.toString().includes('NotFoundError')) {
        setScannerError('No camera found. Please use manual entry.');
      } else {
        setScannerError('Unable to start camera. Please use manual entry.');
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQRCode = async (decodedText: string) => {
    // Extract token from URL or use as-is
    let token = decodedText;
    try {
      const url = new URL(decodedText);
      const urlToken = url.searchParams.get('token');
      if (urlToken) {
        token = urlToken;
      }
    } catch {
      // Not a URL, use as-is
    }

    stopScanner();
    
    try {
      const result = await lookupCode.mutateAsync(token);
      onCodeScanned(result);
    } catch (err) {
      setScannerError('Invalid or expired code');
      if (activeTab === 'scan') {
        setTimeout(() => startScanner(), 2000);
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    try {
      const result = await lookupCode.mutateAsync(manualCode.trim());
      onCodeScanned(result);
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <Card className="border-border/40">
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'scan' | 'manual')}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="scan" className="flex-1 gap-2">
              <Camera className="w-4 h-4" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-2">
              <Keyboard className="w-4 h-4" />
              Enter Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            {scannerError ? (
              <div className="flex flex-col items-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  {scannerError}
                </p>
                <Button variant="outline" onClick={() => setActiveTab('manual')}>
                  Enter Code Manually
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div 
                  id="qr-reader" 
                  ref={containerRef}
                  className="w-full aspect-square max-w-[300px] mx-auto rounded-lg overflow-hidden bg-black"
                />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-2 border-primary/50 rounded-lg" />
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Point your camera at a Waymark QR code
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Connection Code</label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={8}
                  className="text-center text-lg font-mono tracking-widest"
                  autoFocus
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={!manualCode.trim() || lookupCode.isPending}
              >
                {lookupCode.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t border-border/40">
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
