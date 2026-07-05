import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PublicProfileData {
  display_name: string | null;
  avatar_url: string | null;
  username: string;
  user_id: string;
  created_at?: string;
}

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async (): Promise<PublicProfileData | null> => {
      if (!username) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, username, user_id')
        .eq('username', username)
        .eq('is_public', true)
        .single();
      if (error || !data) return null;
      return data as PublicProfileData;
    },
    enabled: !!username,
    staleTime: 30_000,
  });
}

export function usePublicVisits(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-visits', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('visits')
        .select('country_iso2, arrival_date')
        .eq('user_id', userId)
        .order('arrival_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  username: string | null;
  is_public: boolean;
}

export function useProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile> => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, onboarding_complete, username, is_public')
        .eq('user_id', user!.id)
        .single();
      return {
        display_name: data?.display_name ?? null,
        avatar_url: data?.avatar_url ?? null,
        onboarding_complete: data?.onboarding_complete ?? false,
        username: data?.username ?? null,
        is_public: data?.is_public ?? false,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPEG, PNG, WebP, or GIF images are allowed');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    onboardingComplete: query.data?.onboarding_complete ?? false,
    update,
    uploadAvatar,
  };
}
