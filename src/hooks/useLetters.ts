import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVisits } from './useVisits';
import { useCurrentHomeBase } from './useHomeBase';
import { getCountryByIso } from '@/data/countries';
import { useToast } from '@/hooks/use-toast';

export interface WaymarkLetter {
  id: string;
  user_id: string;
  scope: 'year' | 'chapter' | 'custom' | 'trip';
  chapter_id: string | null;
  period_start: string;
  period_end: string;
  title: string;
  subtitle: string | null;
  theme: string;
  body: string;
  supporting_signals: any[];
  stats_snapshot: Record<string, any>;
  status: 'ready' | 'failed';
  error_message: string | null;
  version: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export function useLetters() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['letters', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('waymark_letters')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data as WaymarkLetter[];
    },
    enabled: !!user,
  });
}

export function useLatestLetter() {
  const { data: letters = [], ...rest } = useLetters();
  return {
    letter: letters[0] || null,
    ...rest,
  };
}

export function useLetter(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['letter', id],
    queryFn: async () => {
      if (!user || !id) return null;

      const { data, error } = await supabase
        .from('waymark_letters')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as WaymarkLetter;
    },
    enabled: !!user && !!id,
  });
}

export function useDeleteLetter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waymark_letters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      toast({ description: 'Letter removed from your journal.' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to remove letter.' });
    },
  });
}

export function useGenerateLetter() {
  const { user } = useAuth();
  const { data: visits = [] } = useVisits();
  const { homeBase: currentHomeBase } = useCurrentHomeBase();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      scope: 'year' | 'chapter' | 'custom' | 'trip';
      period_start: string;
      period_end: string;
      chapter_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get entries for the period
      const periodStart = new Date(params.period_start);
      const periodEnd = new Date(params.period_end);

      const entries = visits
        .filter(v => {
          const arrival = new Date(v.arrival_date);
          const departure = v.departure_date ? new Date(v.departure_date) : new Date();
          return arrival <= periodEnd && departure >= periodStart;
        })
        .map(v => {
          const country = getCountryByIso(v.country_iso2);
          return {
            country_iso2: v.country_iso2,
            country_name: country?.name || v.country_iso2,
            start_date: v.arrival_date < params.period_start ? params.period_start : v.arrival_date,
            end_date: (v.departure_date || new Date().toISOString().split('T')[0]) > params.period_end 
              ? params.period_end 
              : (v.departure_date || new Date().toISOString().split('T')[0]),
          };
        });

      if (entries.length === 0) {
        throw new Error('No entries found for this period');
      }

      // Get lifetime countries for context
      const lifetimeCountries = [...new Set(visits.map(v => v.country_iso2))];

      // Call edge function
      const { data: letterData, error: fnError } = await supabase.functions.invoke('generate-letter', {
        body: {
          scope: params.scope,
          period_start: params.period_start,
          period_end: params.period_end,
          entries,
          home_base_country: currentHomeBase?.country_iso2,
          lifetime_countries: lifetimeCountries,
        },
      });

      if (fnError) throw fnError;
      if (letterData?.error) throw new Error(letterData.error);

      // Check for existing letter with same scope and period
      const { data: existing } = await supabase
        .from('waymark_letters')
        .select('version')
        .eq('user_id', user.id)
        .eq('scope', params.scope)
        .eq('period_start', params.period_start)
        .eq('period_end', params.period_end)
        .order('version', { ascending: false })
        .limit(1);

      const version = existing && existing.length > 0 ? existing[0].version + 1 : 1;

      // Insert the letter
      const { data: insertedLetter, error: insertError } = await supabase
        .from('waymark_letters')
        .insert({
          user_id: user.id,
          scope: params.scope,
          chapter_id: params.chapter_id || null,
          period_start: params.period_start,
          period_end: params.period_end,
          title: letterData.title,
          subtitle: letterData.subtitle,
          theme: letterData.theme,
          body: letterData.body,
          supporting_signals: letterData.supporting_signals,
          stats_snapshot: letterData.stats_snapshot,
          status: 'ready',
          version,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return insertedLetter as WaymarkLetter;
    },
    onSuccess: (letter) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      toast({
        title: '✉️ Letter ready',
        description: letter.title,
        action: letter.id ? (
          <a
            href={`/letters/${letter.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            Read it →
          </a>
        ) : undefined,
      });
    },
    onError: (error) => {
      toast({ 
        variant: 'destructive', 
        description: error instanceof Error ? error.message : 'Failed to generate letter.' 
      });
    },
  });
}

export function useEnsureAnnualLetter() {
  const { user } = useAuth();
  const { data: visits = [], isLoading: visitsLoading } = useVisits();
  const { data: letters = [], isLoading: lettersLoading } = useLetters();
  const generateLetter = useGenerateLetter();

  const checkAndGenerate = async () => {
    if (!user || visitsLoading || lettersLoading) return;
    if (generateLetter.isPending) return;

    // Get last complete year
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    const periodStart = `${lastYear}-01-01`;
    const periodEnd = `${lastYear}-12-31`;

    // Check if we have entries for last year
    const lastYearVisits = visits.filter(v => {
      const arrival = new Date(v.arrival_date);
      const departure = v.departure_date ? new Date(v.departure_date) : new Date();
      const yearStart = new Date(periodStart);
      const yearEnd = new Date(periodEnd);
      return arrival <= yearEnd && departure >= yearStart;
    });

    if (lastYearVisits.length === 0) return;

    // Check if annual letter already exists for last year
    const existingAnnual = letters.find(
      l => l.scope === 'year' && 
           l.period_start === periodStart && 
           l.period_end === periodEnd
    );

    if (existingAnnual) return;

    // Generate annual letter
    try {
      await generateLetter.mutateAsync({
        scope: 'year',
        period_start: periodStart,
        period_end: periodEnd,
      });
    } catch (error) {
      console.error('Failed to generate annual letter:', error);
    }
  };

  return { checkAndGenerate, isGenerating: generateLetter.isPending };
}