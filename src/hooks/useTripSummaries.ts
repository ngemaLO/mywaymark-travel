import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface TripSummary {
  id: string;
  user_id: string;
  trip_id: string;
  period_start: string;
  period_end: string | null;
  title: string;
  summary: string;
  highlights: string[];
  stats_snapshot: Record<string, unknown>;
  source_context: Record<string, unknown>;
  status: 'pending' | 'ready' | 'failed';
  error_message: string | null;
  model: string | null;
  version: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

function normalizeHighlights(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeRecord(value: Json): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeTripSummary(data: any): TripSummary {
  return {
    ...data,
    highlights: normalizeHighlights(data.highlights),
    stats_snapshot: normalizeRecord(data.stats_snapshot),
    source_context: normalizeRecord(data.source_context),
  };
}

export function useTripSummary(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-summary', tripId, user?.id],
    queryFn: async () => {
      if (!user || !tripId) return null;

      const { data, error } = await supabase
        .from('trip_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) throw error;
      return data ? normalizeTripSummary(data) : null;
    },
    enabled: !!user && !!tripId,
  });
}

export function useLatestTripSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['latest-trip-summary', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('trip_summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? normalizeTripSummary(data) : null;
    },
    enabled: !!user,
  });
}

export function useTripSummariesByTripIds(tripIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-summaries', user?.id, tripIds.slice().sort().join(',')],
    queryFn: async () => {
      if (!user || tripIds.length === 0) return [];

      const { data, error } = await supabase
        .from('trip_summaries')
        .select('*')
        .eq('user_id', user.id)
        .in('trip_id', tripIds);

      if (error) throw error;
      return (data || []).map(normalizeTripSummary);
    },
    enabled: !!user && tripIds.length > 0,
  });
}

export function useGenerateTripSummary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ tripId, regenerate = false }: { tripId: string; regenerate?: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-trip-summary', {
        body: {
          trip_id: tripId,
          regenerate,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return normalizeTripSummary(data?.summary);
    },
    onSuccess: (summary, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip-summary', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['latest-trip-summary'] });
      queryClient.invalidateQueries({ queryKey: ['trip-summaries'] });
      toast({
        description: variables.regenerate
          ? 'Trip summary refreshed.'
          : 'Trip summary generated.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to generate trip summary.',
      });
    },
  });
}
