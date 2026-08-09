import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Keyboard, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onProfileScanned: (username: string) => void;
  onCancel: () => void;
}

export function QRScanner({ onProfileScanned, onCancel }: QRScannerProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [manualUsername, setManualUsername] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'scan') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
    // startScanner/stopScanner/handleScanned form a circular closure chain
    // (start -> handleScanned -> retry via start); this effect intentionally
    // only reacts to tab switches, not to those functions being redefined.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { handleScanned(decodedText); },
        () => {}
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setScannerError('Camera access denied. Use manual entry instead.');
      } else if (message.includes('NotFoundError')) {
        setScannerError('No camera found. Use manual entry instead.');
      } else {
        setScannerError('Unable to start camera. Use manual entry instead.');
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors — scanner may already be stopped
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanned = (decodedText: string) => {
    let username: string | null = null;
    try {
      const url = new URL(decodedText);
      const match = url.pathname.match(/^\/u\/([^/]+)$/);
      if (match) username = match[1];
    } catch {
      // Not a URL — fall through and treat as an invalid code
    }

    stopScanner();

    if (username) {
      onProfileScanned(username);
    } else {
      setScannerError('Not a valid Waymark QR code. Ask them to show their profile code.');
      setTimeout(() => startScanner(), 2500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualUsername.trim().replace(/^@/, '');
    if (!cleaned) return;
    onProfileScanned(cleaned);
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
              Enter username
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            {scannerError ? (
              <div className="flex flex-col items-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-sm text-center text-muted-foreground">{scannerError}</p>
                <Button variant="outline" onClick={() => setActiveTab('manual')}>
                  Enter Username Instead
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
              Point your camera at a Waymark profile QR code
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  placeholder="@username"
                  className="text-center"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!manualUsername.trim()}>
                Go to profile
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t border-border/40">
          <Button variant="ghost" onClick={onCancel} className="w-full">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
