import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TripConnectionCode {
  id: string;
  user_id: string;
  trip_id: string;
  code: string;
  token: string;
  expires_at: string | null;
  created_at: string;
}

export interface TripConnection {
  id: string;
  trip_id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'pending' | 'active' | 'expired';
  initiated_by: string;
  created_at: string;
  updated_at: string;
}

// Generate a random short code (6-8 chars, alphanumeric, uppercase)
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a secure token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function useConnectionCode(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['connection-code', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return null;

      const { data, error } = await supabase
        .from('trip_connection_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) throw error;
      return data as TripConnectionCode | null;
    },
    enabled: !!user && !!tripId,
  });
}

export function useGenerateConnectionCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Delete any existing code for this trip
      await supabase
        .from('trip_connection_codes')
        .delete()
        .eq('user_id', user.id)
        .eq('trip_id', tripId);

      const code = generateShortCode();
      const token = generateToken();

      const { data, error } = await supabase
        .from('trip_connection_codes')
        .insert({
          user_id: user.id,
          trip_id: tripId,
          code,
          token,
          expires_at: null, // Expires when trip ends
        })
        .select()
        .single();

      if (error) throw error;
      return data as TripConnectionCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connection-code', data.trip_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate code');
    },
  });
}

export function useLookupCode() {
  return useMutation({
    mutationFn: async (codeOrToken: string) => {
      const isToken = codeOrToken.length > 20;
      
      const query = supabase
        .from('trip_connection_codes')
        .select(`
          *,
          trips:trip_id (
            id,
            start_date,
            end_date,
            title
          )
        `);

      if (isToken) {
        query.eq('token', codeOrToken);
      } else {
        query.eq('code', codeOrToken.toUpperCase());
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Invalid code');

      return data;
    },
  });
}

export function useTripConnections(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-connections', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return [];

      const { data, error } = await supabase
        .from('trip_connections')
        .select('*')
        .eq('trip_id', tripId)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (error) throw error;
      return data as TripConnection[];
    },
    enabled: !!user && !!tripId,
  });
}

export function useCreateConnectionRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, otherUserId }: { tripId: string; otherUserId: string }) => {
      if (!user) throw new Error('Must be logged in');

      // Check if connection already exists
      const { data: existing } = await supabase
        .from('trip_connections')
        .select('*')
        .eq('trip_id', tripId)
        .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${otherUserId}),and(user_a_id.eq.${otherUserId},user_b_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'active') {
          throw new Error('Already connected');
        }
        // Update to active if pending and other user initiated
        if (existing.initiated_by !== user.id) {
          const { data, error } = await supabase
            .from('trip_connections')
            .update({ status: 'active' })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
        throw new Error('Connection request already sent');
      }

      // Create new connection request
      const { data, error } = await supabase
        .from('trip_connections')
        .insert({
          trip_id: tripId,
          user_a_id: user.id,
          user_b_id: otherUserId,
          initiated_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as TripConnection;
    },
    onSuccess: (data) => {
      toast.success(data.status === 'active' ? 'Connected!' : 'Connection request sent');
      queryClient.invalidateQueries({ queryKey: ['trip-connections'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to connect');
    },
  });
}

export function useAcceptConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('trip_connections')
        .update({ status: 'active' })
        .eq('id', connectionId)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .select()
        .single();

      if (error) throw error;
      return data as TripConnection;
    },
    onSuccess: () => {
      toast.success('Connection accepted!');
      queryClient.invalidateQueries({ queryKey: ['trip-connections'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept connection');
    },
  });
}

export function useUserConnectionsForTrip(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-connections', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return [];

      const { data, error } = await supabase
        .from('trip_connections')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'active')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (error) throw error;

      // Get the other user's profile for each connection
      const connections = data as TripConnection[];
      const otherUserIds = connections.map(c => 
        c.user_a_id === user.id ? c.user_b_id : c.user_a_id
      );

      if (otherUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', otherUserIds);

      if (profilesError) throw profilesError;

      return connections.map(c => {
        const otherUserId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
        const profile = profiles?.find(p => p.user_id === otherUserId);
        return {
          ...c,
          otherUser: {
            id: otherUserId,
            displayName: profile?.display_name || 'Traveler',
          },
        };
      });
    },
    enabled: !!user && !!tripId,
  });
}
