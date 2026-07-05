import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRScanner } from './QRScanner';
import { ConnectionPreview } from './ConnectionPreview';
import type { CodeLookupResult } from '@/hooks/useTripConnections';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanToConnectModal({ open, onOpenChange }: Props) {
  const [codeData, setCodeData] = useState<CodeLookupResult | null>(null);

  const handleClose = () => {
    setCodeData(null);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{codeData ? 'Connect' : 'Scan to Connect'}</DialogTitle>
        </DialogHeader>

        {codeData ? (
          <ConnectionPreview
            codeData={codeData}
            onConfirm={handleConfirm}
            onCancel={() => setCodeData(null)}
          />
        ) : (
          <QRScanner
            onCodeScanned={setCodeData}
            onCancel={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
