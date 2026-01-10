import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface HomeBase {
  id: string;
  user_id: string;
  country_iso2: string;
  start_date: string;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useHomeBases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['home_bases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('home_bases')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as HomeBase[];
    },
    enabled: !!user,
  });
}

export function useCurrentHomeBase() {
  const { data: homeBases = [], ...rest } = useHomeBases();
  
  const today = new Date().toISOString().split('T')[0];
  
  // Find the current active home base (no end_date or end_date >= today)
  const currentHomeBase = homeBases.find(hb => 
    !hb.end_date || hb.end_date >= today
  );

  return {
    homeBase: currentHomeBase || null,
    homeBases,
    ...rest,
  };
}

export function useHomeBaseMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const setHomeBase = useMutation({
    mutationFn: async ({ 
      countryIso2, 
      startDate, 
      endDate,
      stillLivingHere = false 
    }: { 
      countryIso2: string; 
      startDate?: string;
      endDate?: string;
      stillLivingHere?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      const start = startDate || today;
      const end = stillLivingHere ? null : (endDate || null);

      // If this is a new "current" home base, end any existing active home bases
      if (stillLivingHere || !endDate) {
        const { error: updateError } = await supabase
          .from('home_bases')
          .update({ end_date: start })
          .eq('user_id', user.id)
          .is('end_date', null);

        if (updateError) throw updateError;
      }

      // Create new home base
      const { data, error } = await supabase
        .from('home_bases')
        .insert({
          user_id: user.id,
          country_iso2: countryIso2,
          start_date: start,
          end_date: end,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home_bases'] });
      toast.success('Home base added');
    },
    onError: (error) => {
      toast.error('Failed to add home base');
      console.error('Home base error:', error);
    },
  });

  const clearHomeBase = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];

      // End the current home base
      const { error } = await supabase
        .from('home_bases')
        .update({ end_date: today })
        .eq('user_id', user.id)
        .is('end_date', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home_bases'] });
      toast.success('Home base cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear home base');
      console.error('Home base error:', error);
    },
  });

  const deleteHomeBase = useMutation({
    mutationFn: async (homeBaseId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('home_bases')
        .delete()
        .eq('id', homeBaseId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home_bases'] });
      toast.success('Home base deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete home base');
      console.error('Home base error:', error);
    },
  });

  return { setHomeBase, clearHomeBase, deleteHomeBase };
}

// Helper to check if a date falls within any home base period
export function isDateInHomeBase(
  date: string,
  countryIso2: string,
  homeBases: HomeBase[]
): boolean {
  return homeBases.some(hb => {
    if (hb.country_iso2 !== countryIso2) return false;
    
    const checkDate = new Date(date);
    const start = new Date(hb.start_date);
    const end = hb.end_date ? new Date(hb.end_date) : new Date();
    
    return checkDate >= start && checkDate <= end;
  });
}
