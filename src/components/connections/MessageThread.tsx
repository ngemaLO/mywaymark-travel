import { useState, useRef, useEffect } from 'react';
import { useTripMessages, useSendMessage } from '@/hooks/useTripMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  tripId: string;
  connection: {
    id: string;
    status: string;
    otherUser: {
      id: string;
      displayName: string;
    };
  };
  isTripEnded: boolean;
  onBack: () => void;
}

export function MessageThread({ tripId, connection, isTripEnded, onBack }: MessageThreadProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useTripMessages(connection.id);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isTripEnded) return;

    await sendMessage.mutateAsync({
      tripId,
      connectionId: connection.id,
      content: newMessage,
    });
    setNewMessage('');
  };

  const initials = connection.otherUser.displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <span className="font-medium text-sm">{connection.otherUser.displayName}</span>
        </div>
        {isTripEnded && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            Read-only
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground text-sm">Loading...</p>
        ) : messages?.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Say hello to start the conversation!
          </p>
        ) : (
          messages?.map((message) => {
            const isOwn = message.sender_user_id === user?.id;
            return (
              <div 
                key={message.id} 
                className={cn(
                  'flex',
                  isOwn ? 'justify-end' : 'justify-start'
                )}
              >
                <div 
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2',
                    isOwn 
                      ? 'bg-primary text-primary-foreground rounded-br-sm' 
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={cn(
                    'text-[10px] mt-1',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {format(new Date(message.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isTripEnded ? (
        <div className="p-4 border-t border-border/40 bg-muted/30">
          <p className="text-center text-sm text-muted-foreground">
            This conversation is now read-only
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-4 border-t border-border/40">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
                placeholder="Type a message..."
                disabled={sendMessage.isPending}
                maxLength={2000}
              />
              {newMessage.length > 1900 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  {2000 - newMessage.length}
                </span>
              )}
            </div>
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || sendMessage.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
