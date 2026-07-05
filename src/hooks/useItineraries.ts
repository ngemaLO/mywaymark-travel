import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';
import { useIsPremium } from '@/hooks/usePremium';

export const AI_FREE_LIMIT = 2;

export function useAIUsage() {
  const { user } = useAuth();
  const { isPremium } = useIsPremium();

  const query = useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return { used: 0, resetAt: null as string | null };
      const { data } = await supabase
        .from('profiles')
        .select('ai_generations_used, ai_generations_reset_at')
        .eq('user_id', user.id)
        .single();
      return {
        used: data?.ai_generations_used ?? 0,
        resetAt: (data?.ai_generations_reset_at as string | null) ?? null,
      };
    },
    enabled: !!user && !isPremium,
    staleTime: 60_000,
  });

  const used = query.data?.used ?? 0;

  return {
    used,
    limit: AI_FREE_LIMIT,
    isPro: isPremium,
    canGenerate: isPremium || used < AI_FREE_LIMIT,
    resetAt: query.data?.resetAt ?? null,
    isLoading: query.isLoading,
  };
}

export interface ItineraryActivity {
  time: 'morning' | 'afternoon' | 'evening';
  title: string;
  description: string;
  website?: string;
  booking_url?: string;
  booking_required?: boolean;
  phone?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  location: string;
  title: string;
  activities: ItineraryActivity[];
  tips?: string;
}

export interface ItineraryAccommodationArea {
  name: string;
  description: string;
  best_for: string;
  price_range: string;
}

export interface ItineraryHotel {
  name: string;
  area: string;
  type: string;
  price_range: string;
  why: string;
  website?: string;
  booking_url?: string;
  phone?: string;
}

export interface ItineraryTransportOption {
  type: string;
  description: string;
  cost?: string;
  tip?: string;
  website?: string;
}

export interface ItineraryMetadata {
  accommodation?: {
    areas: ItineraryAccommodationArea[];
    hotels: ItineraryHotel[];
  };
  transport?: {
    summary: string;
    options: ItineraryTransportOption[];
  };
  weather?: {
    summary: string;
    temperature: string;
    conditions: string;
    what_to_pack: string[];
  };
  builder_phase?: 'skeleton' | 'complete';
}

export interface SlotOption {
  title: string;
  description: string;
  website?: string;
  booking_url?: string;
}

export interface ItineraryPreferences {
  style?: string | string[];
  budget?: string;
  group?: string;
  pace?: 'relaxed' | 'balanced' | 'packed';
}

export interface Itinerary {
  id: string;
  user_id: string;
  destination: string;
  destination_iso2: string | null;
  start_date: string;
  end_date: string;
  title: string;
  content: ItineraryDay[];
  preferences: ItineraryPreferences;
  metadata: ItineraryMetadata;
  status: 'generating' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ItineraryMessage {
  id: string;
  itinerary_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function useItineraries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['itineraries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Itinerary[];
    },
    enabled: !!user,
  });
}

export function useItinerary(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['itinerary', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as Itinerary;
    },
    enabled: !!user && !!id,
    refetchInterval: (query) => query.state.data?.status === 'generating' ? 2000 : false,
  });
}

export function useItineraryMessages(itineraryId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['itinerary-messages', itineraryId, user?.id],
    queryFn: async () => {
      if (!user || !itineraryId) return [];
      const { data, error } = await supabase
        .from('itinerary_messages')
        .select('*')
        .eq('itinerary_id', itineraryId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ItineraryMessage[];
    },
    enabled: !!user && !!itineraryId,
  });
}

export function useCreateItinerary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      destination,
      destinationIso2,
      startDate,
      endDate,
      preferences,
    }: {
      destination: string;
      destinationIso2?: string;
      startDate: string;
      endDate: string;
      preferences?: ItineraryPreferences;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const title = `${destination} — ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          destination,
          destination_iso2: destinationIso2 ?? null,
          start_date: startDate,
          end_date: endDate,
          title,
          content: [],
          preferences: preferences ?? {},
          metadata: {},
          status: 'ready',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Itinerary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
    onError: (error) => {
      logError('useCreateItinerary', error);
      toast({ title: 'Failed to create plan', variant: 'destructive' });
    },
  });
}

export function useDeleteItinerary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('itineraries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      toast({ title: 'Plan deleted' });
    },
    onError: (error) => {
      logError('useDeleteItinerary', error);
      toast({ title: 'Failed to delete plan', variant: 'destructive' });
    },
  });
}

export function useResetItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('itineraries')
        .update({ status: 'ready' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
    },
  });
}

export function useSendItineraryMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itineraryId,
      message,
    }: {
      itineraryId: string;
      message: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { itinerary_id: itineraryId, user_message: message },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data as { message: string; itinerary: ItineraryDay[]; metadata: ItineraryMetadata };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', variables.itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-messages', variables.itineraryId] });
    },
    onError: (error) => {
      logError('useSendItineraryMessage', error);
      toast({
        title: 'Failed to get response',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useGenerateSkeleton() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itineraryId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { itinerary_id: itineraryId, mode: 'skeleton' },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data as { itinerary: ItineraryDay[] };
    },
    onSuccess: (_, itineraryId) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage', user?.id] });
    },
    onError: (error) => {
      logError('useGenerateSkeleton', error);
      if (error instanceof Error && error.message === 'generation_limit_reached') {
        toast({
          title: 'Monthly limit reached',
          description: `You've used your ${AI_FREE_LIMIT} free AI plan generations this month.`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Failed to generate plan', variant: 'destructive' });
      }
    },
  });
}

export function useGetSlotOptions() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itineraryId,
      slot,
    }: {
      itineraryId: string;
      slot: { day: number; time: 'morning' | 'afternoon' | 'evening' };
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { itinerary_id: itineraryId, mode: 'slot_options', slot },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data as { options: SlotOption[] };
    },
    onError: (error) => {
      logError('useGetSlotOptions', error);
      toast({ title: 'Failed to get alternatives', variant: 'destructive' });
    },
  });
}

export function useCompleteItinerary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itineraryId,
      currentContent,
    }: {
      itineraryId: string;
      currentContent: ItineraryDay[];
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { itinerary_id: itineraryId, mode: 'complete', current_content: currentContent },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);
      return data as { itinerary: ItineraryDay[]; metadata: ItineraryMetadata };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', variables.itineraryId] });
    },
    onError: (error) => {
      logError('useCompleteItinerary', error);
      toast({
        title: 'Failed to complete itinerary',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
