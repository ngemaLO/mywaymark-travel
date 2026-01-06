import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UpdateVisitData {
  id: string;
  arrival_date: string;
  departure_date: string | null;
}

export function useUpdateVisit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateVisitData) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('visits')
        .update({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-visits'] });
      queryClient.invalidateQueries({ queryKey: ['travel-context'] });
      toast.success('Visit updated');
    },
    onError: (error) => {
      console.error('Failed to update visit:', error);
      toast.error('Failed to update visit');
    },
  });
}

export function useDeleteVisit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (visitId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-visits'] });
      queryClient.invalidateQueries({ queryKey: ['travel-context'] });
      toast.success('Visit deleted');
    },
    onError: (error) => {
      console.error('Failed to delete visit:', error);
      toast.error('Failed to delete visit');
    },
  });
}
