import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TripMessage {
  id: string;
  trip_id: string;
  connection_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
}

export function useTripMessages(connectionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-messages', connectionId, user?.id],
    queryFn: async () => {
      if (!user || !connectionId) return [];

      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TripMessage[];
    },
    enabled: !!user && !!connectionId,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      tripId, 
      connectionId, 
      content 
    }: { 
      tripId: string; 
      connectionId: string; 
      content: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('trip_messages')
        .insert({
          trip_id: tripId,
          connection_id: connectionId,
          sender_user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as TripMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trip-messages', data.connection_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}
