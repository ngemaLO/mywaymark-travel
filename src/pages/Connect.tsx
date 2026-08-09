import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function Connect() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 text-center px-6">
      <Globe className="w-10 h-10 text-muted-foreground/30" />
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">This link has expired</p>
        <p className="text-sm text-muted-foreground">
          Connection codes are no longer used. Ask your friend to share their profile link instead.
        </p>
      </div>
      <Button onClick={() => navigate('/')}>Go home</Button>
    </div>
  );
}
