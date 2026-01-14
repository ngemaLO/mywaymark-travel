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
  status: 'pending' | 'active' | 'expired' | 'rejected';
  initiated_by: string;
  user_a_confirmed: boolean;
  user_b_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

// Generate a random short code (6 chars, alphanumeric, uppercase)
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
          expires_at: null, // Expires when trip ends (checked at lookup time)
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

export interface CodeLookupResult {
  id: string;
  user_id: string;
  trip_id: string;
  code: string;
  token: string;
  expires_at: string | null;
  created_at: string;
  trips: {
    id: string;
    start_date: string;
    end_date: string | null;
    title: string | null;
  };
  isExpired: boolean;
}

export function useLookupCode() {
  return useMutation({
    mutationFn: async (codeOrToken: string): Promise<CodeLookupResult> => {
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

      // Check if trip has ended (QR is expired)
      const isExpired = data.trips?.end_date !== null;

      return { ...data, isExpired };
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

// Get pending connection requests that need user's confirmation
export function usePendingConnections(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-connections', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return [];

      const { data, error } = await supabase
        .from('trip_connections')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (error) throw error;

      // Filter to only show connections where THIS user hasn't confirmed yet
      const pending = (data as TripConnection[]).filter(c => {
        if (c.user_a_id === user.id) {
          return !c.user_a_confirmed;
        } else {
          return !c.user_b_confirmed;
        }
      });

      // Get other user profiles
      const otherUserIds = pending.map(c => 
        c.user_a_id === user.id ? c.user_b_id : c.user_a_id
      );

      if (otherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', otherUserIds);

      return pending.map(c => {
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
        if (existing.status === 'rejected') {
          throw new Error('Connection was declined');
        }
        // If pending, mark this user as confirmed
        const isUserA = existing.user_a_id === user.id;
        const updateField = isUserA ? 'user_a_confirmed' : 'user_b_confirmed';
        const otherConfirmed = isUserA ? existing.user_b_confirmed : existing.user_a_confirmed;

        const updates: any = { [updateField]: true };
        
        // If both are now confirmed, set to active
        if (otherConfirmed) {
          updates.status = 'active';
        }

        const { data, error } = await supabase
          .from('trip_connections')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return { connection: data, isNewlyActive: updates.status === 'active' };
      }

      // Create new connection request with this user confirmed
      const { data, error } = await supabase
        .from('trip_connections')
        .insert({
          trip_id: tripId,
          user_a_id: user.id,
          user_b_id: otherUserId,
          initiated_by: user.id,
          user_a_confirmed: true,
          user_b_confirmed: false,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { connection: data, isNewlyActive: false };
    },
    onSuccess: ({ connection, isNewlyActive }) => {
      if (isNewlyActive) {
        toast.success('Connected! You can now message each other.');
      } else {
        toast.success('Request sent. Waiting for them to confirm.');
      }
      queryClient.invalidateQueries({ queryKey: ['trip-connections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
      queryClient.invalidateQueries({ queryKey: ['user-connections'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to connect');
    },
  });
}

export function useConfirmConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Get the connection first
      const { data: connection, error: fetchError } = await supabase
        .from('trip_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (fetchError || !connection) throw new Error('Connection not found');

      const isUserA = connection.user_a_id === user.id;
      const updateField = isUserA ? 'user_a_confirmed' : 'user_b_confirmed';
      const otherConfirmed = isUserA ? connection.user_b_confirmed : connection.user_a_confirmed;

      const updates: any = { [updateField]: true };
      
      // If both are now confirmed, set to active
      if (otherConfirmed) {
        updates.status = 'active';
      }

      const { data, error } = await supabase
        .from('trip_connections')
        .update(updates)
        .eq('id', connectionId)
        .select()
        .single();

      if (error) throw error;
      return { connection: data, isNowActive: updates.status === 'active' };
    },
    onSuccess: ({ isNowActive }) => {
      if (isNowActive) {
        toast.success('Connected! You can now message each other.');
      } else {
        toast.success('Confirmed. Waiting for them to confirm too.');
      }
      queryClient.invalidateQueries({ queryKey: ['trip-connections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
      queryClient.invalidateQueries({ queryKey: ['user-connections'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to confirm connection');
    },
  });
}

export function useRejectConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('trip_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Connection declined');
      queryClient.invalidateQueries({ queryKey: ['trip-connections'] });
      queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to decline connection');
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
