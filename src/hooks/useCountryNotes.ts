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

// Fetch single note (first one) — used for free tier display
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
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CountryNote | null;
    },
    enabled: !!user && !!countryIso2,
  });
}

// Fetch ALL notes for a country — used for premium multi-note display
export function useCountryNotes(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['country-notes', countryIso2, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('country_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CountryNote[];
    },
    enabled: !!user && !!countryIso2,
  });
}

// Save (upsert) the single note — free tier behavior
export function useSaveCountryNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ countryIso2, note, noteId }: { countryIso2: string; note: string; noteId?: string }) => {
      if (!user) throw new Error('Not authenticated');

      if (noteId) {
        // Update existing note by ID
        const { data, error } = await supabase
          .from('country_notes')
          .update({ note, updated_at: new Date().toISOString() })
          .eq('id', noteId)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Free-tier upsert: check if note exists
      const { data: existing } = await supabase
        .from('country_notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('country_notes')
          .update({ note, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
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
      queryClient.invalidateQueries({ queryKey: ['country-notes', variables.countryIso2] });
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

// Add a NEW note (premium only)
export function useAddCountryNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ countryIso2, note }: { countryIso2: string; note: string }) => {
      if (!user) throw new Error('Not authenticated');

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
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['country-note', variables.countryIso2] });
      queryClient.invalidateQueries({ queryKey: ['country-notes', variables.countryIso2] });
      toast({ title: 'Note added', description: 'Your new note has been added.' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error adding note', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete a note
export function useDeleteCountryNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, countryIso2 }: { noteId: string; countryIso2: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('country_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { noteId, countryIso2 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['country-note', result.countryIso2] });
      queryClient.invalidateQueries({ queryKey: ['country-notes', result.countryIso2] });
      toast({ title: 'Note deleted' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting note', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
