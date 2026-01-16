import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Chapter {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  home_base_country_iso2: string | null;
  description: string | null;
  cover_style: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChapterData {
  title: string;
  start_date: string;
  end_date: string | null;
  home_base_country_iso2?: string | null;
  description?: string | null;
}

// Maximum chapters for free users
export const FREE_CHAPTER_LIMIT = 2;

export function useChapters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chapters', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!user,
  });
}

export function useCurrentChapter() {
  const { data: chapters = [], ...rest } = useChapters();
  
  const today = new Date().toISOString().split('T')[0];
  
  const currentChapter = chapters.find(chapter => {
    const isAfterStart = chapter.start_date <= today;
    const isBeforeEnd = !chapter.end_date || chapter.end_date >= today;
    return isAfterStart && isBeforeEnd;
  });

  return { currentChapter, chapters, ...rest };
}

export function useCreateChapter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChapterData) => {
      if (!user) throw new Error('Must be logged in');

      const { data: chapter, error } = await supabase
        .from('chapters')
        .insert({
          user_id: user.id,
          title: data.title,
          start_date: data.start_date,
          end_date: data.end_date,
          home_base_country_iso2: data.home_base_country_iso2 || null,
          description: data.description || null,
          is_private: true,
        })
        .select()
        .single();

      if (error) throw error;
      return chapter as Chapter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast.success('Chapter created!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create chapter');
    },
  });
}

export function useUpdateChapter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Chapter> & { id: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { data: chapter, error } = await supabase
        .from('chapters')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return chapter as Chapter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast.success('Chapter updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update chapter');
    },
  });
}

export function useDeleteChapter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapterId: string) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      toast.success('Chapter deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete chapter');
    },
  });
}
