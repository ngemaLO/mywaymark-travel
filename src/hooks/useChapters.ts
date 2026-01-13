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

export interface ChapterTrip {
  id: string;
  user_id: string;
  chapter_id: string;
  trip_id: string;
  added_method: 'auto' | 'manual';
  created_at: string;
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

export function useChapterTrips(chapterId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chapter-trips', chapterId, user?.id],
    queryFn: async () => {
      if (!user || !chapterId) return [];
      
      const { data, error } = await supabase
        .from('chapter_trips')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId);

      if (error) throw error;
      return data as ChapterTrip[];
    },
    enabled: !!user && !!chapterId,
  });
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
      queryClient.invalidateQueries({ queryKey: ['chapter-trips'] });
      toast.success('Chapter deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete chapter');
    },
  });
}

export function useAddChapterTrips() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      chapterId, 
      tripIds, 
      addedMethod = 'auto' 
    }: { 
      chapterId: string; 
      tripIds: string[]; 
      addedMethod?: 'auto' | 'manual';
    }) => {
      if (!user) throw new Error('Must be logged in');
      if (tripIds.length === 0) return [];

      const chapterTrips = tripIds.map(tripId => ({
        user_id: user.id,
        chapter_id: chapterId,
        trip_id: tripId,
        added_method: addedMethod,
      }));

      const { data, error } = await supabase
        .from('chapter_trips')
        .upsert(chapterTrips, { 
          onConflict: 'chapter_id,trip_id',
          ignoreDuplicates: true 
        })
        .select();

      if (error) throw error;
      return data as ChapterTrip[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-trips'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add trips to chapter');
    },
  });
}

export function useRemoveChapterTrip() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, tripId }: { chapterId: string; tripId: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('chapter_trips')
        .delete()
        .eq('chapter_id', chapterId)
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-trips'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove trip from chapter');
    },
  });
}

// Get trips that overlap with a chapter's date range
export function useSuggestedTripsForChapter(chapter: Chapter | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggested-trips', chapter?.id, user?.id],
    queryFn: async () => {
      if (!user || !chapter) return [];

      // Fetch all user trips
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Filter trips that overlap with chapter date range
      // Overlap rule: trip overlaps if (trip.start_date <= chapter_end OR chapter_end is null) 
      //               AND (trip.end_date >= chapter_start OR trip.end_date is null)
      const overlappingTrips = (trips || []).filter(trip => {
        const tripStart = trip.start_date;
        const tripEnd = trip.end_date || trip.start_date; // Use start as end if no end date
        const chapterStart = chapter.start_date;
        const chapterEnd = chapter.end_date;

        const tripStartsBeforeChapterEnds = !chapterEnd || tripStart <= chapterEnd;
        const tripEndsAfterChapterStarts = tripEnd >= chapterStart;

        return tripStartsBeforeChapterEnds && tripEndsAfterChapterStarts;
      });

      return overlappingTrips;
    },
    enabled: !!user && !!chapter,
  });
}

// Get countries visited within a chapter (via chapter_trips)
export function useChapterCountries(chapterId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chapter-countries', chapterId, user?.id],
    queryFn: async () => {
      if (!user || !chapterId) return [];

      // Get trip IDs in this chapter
      const { data: chapterTrips, error: ctError } = await supabase
        .from('chapter_trips')
        .select('trip_id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId);

      if (ctError) throw ctError;

      const tripIds = chapterTrips?.map(ct => ct.trip_id) || [];
      if (tripIds.length === 0) return [];

      // Get visits for these trips
      const { data: visits, error: vError } = await supabase
        .from('visits')
        .select('country_iso2')
        .eq('user_id', user.id)
        .in('trip_id', tripIds);

      if (vError) throw vError;

      // Get unique countries
      const uniqueCountries = [...new Set(visits?.map(v => v.country_iso2) || [])];
      return uniqueCountries;
    },
    enabled: !!user && !!chapterId,
  });
}
