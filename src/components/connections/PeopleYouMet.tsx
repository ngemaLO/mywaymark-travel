import { useUserConnectionsForTrip } from '@/hooks/useTripConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PeopleYouMetProps {
  tripId: string;
  onOpenChat: (connection: any) => void;
}

export function PeopleYouMet({ tripId, onOpenChat }: PeopleYouMetProps) {
  const { data: connections, isLoading } = useUserConnectionsForTrip(tripId);

  if (isLoading) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            People You Met
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            People You Met
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No connections yet. Share your QR code to connect!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          People You Met
          <span className="text-muted-foreground font-normal">
            ({connections.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {connections.map((connection) => {
          const initials = connection.otherUser.displayName.slice(0, 2).toUpperCase();
          
          return (
            <div 
              key={connection.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">
                  {connection.otherUser.displayName}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onOpenChat(connection)}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
