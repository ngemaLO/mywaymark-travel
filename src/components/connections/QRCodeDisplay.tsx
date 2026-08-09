import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { COPY_FEEDBACK_MS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export function QRCodeDisplay() {
  const { profile, isLoading } = useProfile();
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Skeleton className="w-48 h-48 rounded-lg" />
          <Skeleton className="w-32 h-5" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.username) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center">
            <QrCode className="w-16 h-16 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">
            Set a username in{' '}
            <Link to="/settings" className="text-primary underline underline-offset-4">
              Settings
            </Link>{' '}
            to generate your QR code.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile.is_public) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center">
            <QrCode className="w-16 h-16 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your profile is private, so a QR code would lead nowhere. Make it public in{' '}
            <Link to="/settings" className="text-primary underline underline-offset-4">
              Settings
            </Link>{' '}
            to share it.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profileUrl = `${window.location.origin}/u/${profile.username}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return (
    <Card className="border-border/40">
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG value={profileUrl} size={180} level="M" includeMargin={false} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">@{profile.username}</p>
          <p className="text-xs text-muted-foreground">Anyone who scans this can follow you</p>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
