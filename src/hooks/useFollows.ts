import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PublicUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export interface FeedItem {
  id: string;
  country_iso2: string;
  arrival_date: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

// ── Counts ───────────────────────────────────────────────────────────────────

export function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['follower-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['following-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId);
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ── Is following ─────────────────────────────────────────────────────────────

export function useIsFollowing(targetUserId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-following', user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return false;
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
    staleTime: 30_000,
  });
}

// ── Follow / Unfollow mutations ───────────────────────────────────────────────

export function useFollow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });
      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      qc.invalidateQueries({ queryKey: ['is-following', user?.id, targetUserId] });
      qc.invalidateQueries({ queryKey: ['follower-count', targetUserId] });
      qc.invalidateQueries({ queryKey: ['following-count', user?.id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => toast({ title: 'Failed to follow', variant: 'destructive' }),
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      qc.invalidateQueries({ queryKey: ['is-following', user?.id, targetUserId] });
      qc.invalidateQueries({ queryKey: ['follower-count', targetUserId] });
      qc.invalidateQueries({ queryKey: ['following-count', user?.id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => toast({ title: 'Failed to unfollow', variant: 'destructive' }),
  });
}

// ── Feed ─────────────────────────────────────────────────────────────────────

export function useFeed() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed', user?.id],
    queryFn: async (): Promise<FeedItem[]> => {
      if (!user) return [];

      // Get IDs of people this user follows
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = (followData ?? []).map(f => f.following_id);
      if (followingIds.length === 0) return [];

      // Get their recent visits
      const { data: visits } = await supabase
        .from('visits')
        .select('id, country_iso2, arrival_date, user_id')
        .in('user_id', followingIds)
        .order('arrival_date', { ascending: false })
        .limit(50);

      if (!visits || visits.length === 0) return [];

      // Get profiles for those users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', followingIds)
        .eq('is_public', true);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map(p => [p.user_id, p])
      );

      return visits
        .filter(v => profileMap[v.user_id])
        .map(v => ({
          id: v.id,
          country_iso2: v.country_iso2,
          arrival_date: v.arrival_date,
          user_id: v.user_id,
          display_name: profileMap[v.user_id]?.display_name ?? null,
          avatar_url: profileMap[v.user_id]?.avatar_url ?? null,
          username: profileMap[v.user_id]?.username ?? null,
        }));
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

// ── Search profiles ───────────────────────────────────────────────────────────

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: ['search-profiles', query],
    queryFn: async (): Promise<PublicUser[]> => {
      if (query.trim().length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .eq('is_public', true)
        .ilike('username', `%${query.trim()}%`)
        .limit(10);
      return (data ?? []) as PublicUser[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });
}

// ── Friends who visited a country ────────────────────────────────────────────

export interface FriendVisitor {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  most_recent_visit: string | null;
}

export function useFriendsWhoVisited(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends-who-visited', user?.id, countryIso2],
    queryFn: async (): Promise<FriendVisitor[]> => {
      if (!user || !countryIso2) return [];

      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = (followData ?? []).map(f => f.following_id);
      if (followingIds.length === 0) return [];

      const { data: visits } = await supabase
        .from('visits')
        .select('user_id, arrival_date')
        .in('user_id', followingIds)
        .eq('country_iso2', countryIso2)
        .order('arrival_date', { ascending: false });

      if (!visits || visits.length === 0) return [];

      const visitorIds = [...new Set(visits.map(v => v.user_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', visitorIds)
        .eq('is_public', true);

      if (!profiles || profiles.length === 0) return [];

      const mostRecentByUser = new Map<string, string>();
      visits.forEach(v => {
        if (!mostRecentByUser.has(v.user_id)) mostRecentByUser.set(v.user_id, v.arrival_date);
      });

      return profiles.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        username: p.username,
        most_recent_visit: mostRecentByUser.get(p.user_id) ?? null,
      }));
    },
    enabled: !!user && !!countryIso2,
    staleTime: 60_000,
  });
}

// ── Following list ────────────────────────────────────────────────────────────

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async (): Promise<PublicUser[]> => {
      if (!userId) return [];
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const ids = (followData ?? []).map(f => f.following_id);
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', ids);

      return (profiles ?? []) as PublicUser[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
