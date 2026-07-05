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
  source: 'follow' | 'connection';
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

      // Fetch follows and active trip connections in parallel
      const [followResult, connectionResult] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase
          .from('trip_connections')
          .select('user_a_id, user_b_id')
          .eq('status', 'active')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
      ]);

      // Build a source map: userId → 'follow' | 'connection'
      // Follows take precedence over connections when a user appears in both.
      const sourceMap = new Map<string, FeedItem['source']>();
      for (const f of followResult.data ?? []) {
        sourceMap.set(f.following_id, 'follow');
      }
      for (const c of connectionResult.data ?? []) {
        const partnerId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
        if (!sourceMap.has(partnerId)) sourceMap.set(partnerId, 'connection');
      }

      const allIds = [...sourceMap.keys()];
      if (allIds.length === 0) return [];

      // Get their recent visits + public profiles in parallel
      const [visitResult, profileResult] = await Promise.all([
        supabase
          .from('visits')
          .select('id, country_iso2, arrival_date, user_id')
          .in('user_id', allIds)
          .order('arrival_date', { ascending: false })
          .limit(50),
        supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', allIds)
          .eq('is_public', true),
      ]);

      if (!visitResult.data || visitResult.data.length === 0) return [];

      const profileMap = Object.fromEntries(
        (profileResult.data ?? []).map(p => [p.user_id, p])
      );

      return visitResult.data
        .filter(v => profileMap[v.user_id])
        .map(v => ({
          id: v.id,
          country_iso2: v.country_iso2,
          arrival_date: v.arrival_date,
          user_id: v.user_id,
          display_name: profileMap[v.user_id]?.display_name ?? null,
          avatar_url: profileMap[v.user_id]?.avatar_url ?? null,
          username: profileMap[v.user_id]?.username ?? null,
          source: sourceMap.get(v.user_id) ?? 'follow',
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

// ── Connection social map data ────────────────────────────────────────────────

async function getConnectionIds(userId: string) {
  const [followResult, connectionResult] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase.from('trip_connections').select('user_a_id, user_b_id').eq('status', 'active')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`),
  ]);
  const ids = new Set<string>();
  for (const f of followResult.data ?? []) ids.add(f.following_id);
  for (const c of connectionResult.data ?? []) {
    ids.add(c.user_a_id === userId ? c.user_b_id : c.user_a_id);
  }
  return [...ids];
}

// All unique countries visited by any connection (for ambient map tint).
export function useConnectionVisitedCountries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['connection-visited-countries', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const ids = await getConnectionIds(user.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from('visits').select('country_iso2').in('user_id', ids);
      return [...new Set((data ?? []).map(v => v.country_iso2))];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export interface ConnectionCurrentTrip {
  user_id: string;
  country_iso2: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

// Connections who are currently traveling (no departure_date on latest visit).
export function useConnectionCurrentTrips() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['connection-current-trips', user?.id],
    queryFn: async (): Promise<ConnectionCurrentTrip[]> => {
      if (!user) return [];
      const ids = await getConnectionIds(user.id);
      if (ids.length === 0) return [];
      const [visitResult, profileResult] = await Promise.all([
        supabase.from('visits').select('user_id, country_iso2').in('user_id', ids).is('departure_date', null),
        supabase.from('profiles').select('user_id, display_name, avatar_url, username').in('user_id', ids).eq('is_public', true),
      ]);
      const profileMap = Object.fromEntries((profileResult.data ?? []).map(p => [p.user_id, p]));
      return (visitResult.data ?? [])
        .filter(v => profileMap[v.user_id])
        .map(v => ({
          user_id: v.user_id,
          country_iso2: v.country_iso2,
          display_name: profileMap[v.user_id]?.display_name ?? null,
          avatar_url: profileMap[v.user_id]?.avatar_url ?? null,
          username: profileMap[v.user_id]?.username ?? null,
        }));
    },
    enabled: !!user,
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
