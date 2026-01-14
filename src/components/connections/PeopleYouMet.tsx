import { useUserConnectionsForTrip, usePendingConnections, useConfirmConnection, useRejectConnection } from '@/hooks/useTripConnections';
import { useIsPremium } from '@/hooks/usePremium';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Check, X, Clock, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PeopleYouMetProps {
  tripId: string;
  onOpenChat: (connection: any) => void;
}

export function PeopleYouMet({ tripId, onOpenChat }: PeopleYouMetProps) {
  const { data: connections, isLoading } = useUserConnectionsForTrip(tripId);
  const { data: pendingConnections, isLoading: pendingLoading } = usePendingConnections(tripId);
  const confirmConnection = useConfirmConnection();
  const rejectConnection = useRejectConnection();
  const { isPremium } = useIsPremium();

  if (isLoading || pendingLoading) {
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

  const hasPending = pendingConnections && pendingConnections.length > 0;
  const hasConnections = connections && connections.length > 0;

  if (!hasPending && !hasConnections) {
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

  const handleConfirm = (connectionId: string) => {
    confirmConnection.mutate(connectionId);
  };

  const handleReject = (connectionId: string) => {
    rejectConnection.mutate(connectionId);
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          People You Met
          {(hasConnections || hasPending) && (
            <span className="text-muted-foreground font-normal">
              ({(connections?.length || 0) + (pendingConnections?.length || 0)})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pending Connections */}
        {hasPending && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </p>
            {pendingConnections.map((connection) => {
              const initials = connection.otherUser.displayName.slice(0, 2).toUpperCase();
              
              return (
                <div 
                  key={connection.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-sm">
                        {connection.otherUser.displayName}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Wants to connect
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isPremium ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleReject(connection.id)}
                          disabled={rejectConnection.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          onClick={() => handleConfirm(connection.id)}
                          disabled={confirmConnection.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-xs gap-1"
                        disabled
                      >
                        <Sparkles className="w-3 h-3" />
                        Plus
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active Connections */}
        {hasConnections && (
          <div className="space-y-2">
            {hasPending && (
              <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">
                Connected
              </p>
            )}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
