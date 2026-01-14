import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ConnectionPreview } from '@/components/connections/ConnectionPreview';
import { QRScanner } from '@/components/connections/QRScanner';
import { useLookupCode, CodeLookupResult } from '@/hooks/useTripConnections';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Connect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [codeData, setCodeData] = useState<CodeLookupResult | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const lookupCode = useLookupCode();

  const token = searchParams.get('token');
  const code = searchParams.get('code');

  useEffect(() => {
    const lookup = token || code;
    if (lookup && user && !codeData) {
      lookupCode.mutateAsync(lookup).then(setCodeData).catch(() => {
        // Invalid code - show scanner
        setShowScanner(true);
      });
    }
  }, [token, code, user]);

  const handleConfirm = () => {
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleCodeScanned = (data: CodeLookupResult) => {
    setCodeData(data);
    setShowScanner(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="max-w-md mx-auto text-center space-y-6">
            <h1 className="text-2xl font-display font-bold">Connect with a Traveler</h1>
            <p className="text-muted-foreground">
              Sign in to connect with this traveler
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="max-w-md mx-auto">
          {lookupCode.isPending ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Looking up connection...</p>
            </div>
          ) : codeData ? (
            <ConnectionPreview
              codeData={codeData}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ) : showScanner ? (
            <>
              <h1 className="text-2xl font-display font-bold text-center mb-6">
                Scan or Enter Code
              </h1>
              <QRScanner
                onCodeScanned={handleCodeScanned}
                onCancel={handleCancel}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Invalid or expired connection link</p>
              <Button onClick={handleCancel} className="mt-4">
                Go Home
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
