import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ShareLink {
  id: string;
  user_id: string;
  token: string;
  active: boolean | null;
  expires_at: string | null;
  detail_level: string | null;
  scope_map: boolean | null;
  scope_stats: boolean | null;
  scope_timeline: boolean | null;
  scope_badges: boolean | null;
  scope_notes: boolean | null;
  scope_images: boolean | null;
  created_at: string | null;
}

export interface CreateShareLinkData {
  detail_level: 'overview' | 'detailed';
  scope_map: boolean;
  scope_stats: boolean;
  scope_timeline: boolean;
  scope_badges: boolean;
  scope_notes: boolean;
  scope_images: boolean;
  expires_at?: string | null;
}

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function useShareLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['share-links', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ShareLink[];
    },
    enabled: !!user,
  });
}

export function useCreateShareLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShareLinkData) => {
      if (!user) throw new Error('Not authenticated');

      const token = generateToken();
      
      const { data: result, error } = await supabase
        .from('share_links')
        .insert({
          user_id: user.id,
          token,
          active: true,
          detail_level: data.detail_level,
          scope_map: data.scope_map,
          scope_stats: data.scope_stats,
          scope_timeline: data.scope_timeline,
          scope_badges: data.scope_badges,
          scope_notes: data.scope_notes,
          scope_images: data.scope_images,
          expires_at: data.expires_at,
        })
        .select()
        .single();

      if (error) throw error;
      return result as ShareLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
      toast({ title: 'Share link created', description: 'Your shareable link is ready.' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error creating share link', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('share_links')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      return { id, active };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
      toast({ 
        title: data.active ? 'Link enabled' : 'Link disabled',
        description: data.active ? 'The share link is now active.' : 'The share link has been disabled.',
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating share link', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('share_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
      toast({ title: 'Link deleted', description: 'The share link has been removed.' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting share link', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook for public access - fetches share link and user data securely via edge function
export function usePublicShareLink(token: string | undefined) {
  return useQuery({
    queryKey: ['public-share-link', token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase.functions.invoke('get-shared-data', {
        body: { token },
      });

      if (error) throw error;
      if (!data || data.error) return null;

      return data.shareLink as ShareLink;
    },
    enabled: !!token,
  });
}

// Hook to fetch shared user data (visits, notes, images) securely via edge function
export function useSharedUserData(token: string | undefined, shareLink: ShareLink | null) {
  return useQuery({
    queryKey: ['shared-user-data', token, shareLink?.id],
    queryFn: async () => {
      if (!token || !shareLink) return null;

      // Data is already fetched by the edge function in usePublicShareLink
      // Re-fetch to get full data (this could be optimized with caching)
      const { data, error } = await supabase.functions.invoke('get-shared-data', {
        body: { token },
      });

      if (error) throw error;
      if (!data || data.error) return null;

      return {
        visits: data.visits || [],
        notes: data.notes || [],
        images: data.images || [],
        trips: data.trips || [],
        flights: data.flights || 0,
      };
    },
    enabled: !!token && !!shareLink,
  });
}
