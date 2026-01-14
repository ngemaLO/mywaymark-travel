import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Lock } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  onClose?: () => void;
}

export function UpgradePrompt({ feature, onClose }: UpgradePromptProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <CardContent className="p-6 space-y-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Waymark Plus</h3>
          <p className="text-sm text-muted-foreground">
            {feature} is a Waymark Plus feature.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button className="w-full gap-2" disabled>
            <Lock className="w-4 h-4" />
            Coming Soon
          </Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose} className="w-full">
              Maybe Later
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Premium features are launching soon. Stay tuned!
        </p>
      </CardContent>
    </Card>
  );
}
