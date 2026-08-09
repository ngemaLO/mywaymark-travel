import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRScanner } from './QRScanner';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QrCode, Camera } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanToConnectModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<'mine' | 'scan'>('mine');
  const navigate = useNavigate();

  const handleClose = () => onOpenChange(false);

  const handleProfileScanned = (username: string) => {
    handleClose();
    navigate(`/u/${username}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect in Person</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'mine' | 'scan')}>
          <TabsList className="w-full">
            <TabsTrigger value="mine" className="flex-1 gap-2">
              <QrCode className="w-4 h-4" />
              My code
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex-1 gap-2">
              <Camera className="w-4 h-4" />
              Scan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-4">
            <QRCodeDisplay />
          </TabsContent>

          <TabsContent value="scan" className="mt-4">
            <QRScanner
              onProfileScanned={handleProfileScanned}
              onCancel={handleClose}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
