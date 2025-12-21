import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CountryNote {
  id: string;
  user_id: string;
  country_iso2: string;
  note: string | null;
  updated_at: string | null;
}

export function useCountryNote(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['country-note', countryIso2, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('country_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .maybeSingle();

      if (error) throw error;
      return data as CountryNote | null;
    },
    enabled: !!user && !!countryIso2,
  });
}

export function useSaveCountryNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ countryIso2, note }: { countryIso2: string; note: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if note exists
      const { data: existing } = await supabase
        .from('country_notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .maybeSingle();

      if (existing) {
        // Update existing note
        const { data, error } = await supabase
          .from('country_notes')
          .update({ note, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new note
        const { data, error } = await supabase
          .from('country_notes')
          .insert({
            user_id: user.id,
            country_iso2: countryIso2,
            note,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['country-note', variables.countryIso2] });
      toast({ title: 'Note saved', description: 'Your note has been saved successfully.' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error saving note', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
