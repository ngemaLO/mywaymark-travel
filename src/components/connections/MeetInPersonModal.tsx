import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QRScanner } from './QRScanner';
import { ConnectionPreview } from './ConnectionPreview';
import { PeopleYouMet } from './PeopleYouMet';
import { MessageThread } from './MessageThread';
import { QrCode, Camera, Users } from 'lucide-react';

interface MeetInPersonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  isTripEnded?: boolean;
}

type ViewState = 
  | { type: 'tabs' }
  | { type: 'preview'; codeData: any }
  | { type: 'chat'; connection: any };

export function MeetInPersonModal({ 
  open, 
  onOpenChange, 
  tripId,
  isTripEnded = false,
}: MeetInPersonModalProps) {
  const [view, setView] = useState<ViewState>({ type: 'tabs' });
  const [activeTab, setActiveTab] = useState<'share' | 'scan' | 'people'>('share');

  const handleCodeScanned = (codeData: any) => {
    setView({ type: 'preview', codeData });
  };

  const handleConnectionConfirmed = () => {
    setView({ type: 'tabs' });
    setActiveTab('people');
  };

  const handleOpenChat = (connection: any) => {
    setView({ type: 'chat', connection });
  };

  const handleClose = () => {
    setView({ type: 'tabs' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view.type === 'chat' 
              ? 'Messages' 
              : view.type === 'preview'
                ? 'Connect'
                : 'Meet in Person'}
          </DialogTitle>
        </DialogHeader>

        {view.type === 'tabs' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="share" className="flex-1 gap-2">
                <QrCode className="w-4 h-4" />
                Share
              </TabsTrigger>
              <TabsTrigger value="scan" className="flex-1 gap-2" disabled={isTripEnded}>
                <Camera className="w-4 h-4" />
                Scan
              </TabsTrigger>
              <TabsTrigger value="people" className="flex-1 gap-2">
                <Users className="w-4 h-4" />
                People
              </TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="mt-4">
              <QRCodeDisplay tripId={tripId} />
            </TabsContent>

            <TabsContent value="scan" className="mt-4">
              {!isTripEnded && (
                <QRScanner 
                  onCodeScanned={handleCodeScanned}
                  onCancel={() => setActiveTab('share')}
                />
              )}
            </TabsContent>

            <TabsContent value="people" className="mt-4">
              <PeopleYouMet 
                tripId={tripId} 
                onOpenChat={handleOpenChat}
              />
            </TabsContent>
          </Tabs>
        )}

        {view.type === 'preview' && (
          <ConnectionPreview
            codeData={view.codeData}
            onConfirm={handleConnectionConfirmed}
            onCancel={() => setView({ type: 'tabs' })}
          />
        )}

        {view.type === 'chat' && (
          <MessageThread
            tripId={tripId}
            connection={view.connection}
            isTripEnded={isTripEnded}
            onBack={() => setView({ type: 'tabs' })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
