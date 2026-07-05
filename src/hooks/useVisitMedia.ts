import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface VisitMedia {
  id: string;
  user_id: string;
  visit_id: string;
  url: string;
  storage_path: string | null;
  media_type: 'photo' | 'video';
  caption: string | null;
  created_at: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PHOTOS_PER_VISIT = 30;

export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? null;
}

export function isVideoUrl(url: string): boolean {
  return !!getYouTubeId(url) || !!getVimeoId(url);
}

export function useVisitMedia(visitId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['visit-media', visitId],
    queryFn: async (): Promise<VisitMedia[]> => {
      const { data, error } = await supabase
        .from('visit_media')
        .select('*')
        .eq('visit_id', visitId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as VisitMedia[];
    },
    enabled: !!user && !!visitId,
  });
}

export function useUploadVisitPhotos() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, files }: { visitId: string; files: File[] }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('visit_media')
        .select('id')
        .eq('visit_id', visitId)
        .eq('media_type', 'photo');
      const currentCount = existing?.length ?? 0;

      const toUpload = files.slice(0, MAX_PHOTOS_PER_VISIT - currentCount);
      if (toUpload.length === 0) throw new Error(`Maximum of ${MAX_PHOTOS_PER_VISIT} photos per visit reached`);

      const results = await Promise.all(toUpload.map(async (file) => {
        if (!ALLOWED_TYPES.includes(file.type)) throw new Error(`${file.name}: unsupported type`);
        if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: must be under 10 MB`);

        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${visitId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('visit-media')
          .upload(path, file, { cacheControl: '3600' });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from('visit-media').getPublicUrl(path);

        const { data, error } = await supabase.from('visit_media').insert({
          user_id: user.id,
          visit_id: visitId,
          url: urlData.publicUrl,
          storage_path: path,
          media_type: 'photo',
        }).select().single();
        if (error) throw error;
        return data;
      }));

      return results;
    },
    onSuccess: (_, { visitId }) => {
      qc.invalidateQueries({ queryKey: ['visit-media', visitId] });
      toast({ title: 'Photos uploaded' });
    },
    onError: (err: Error) => toast({ title: 'Upload failed', description: err.message, variant: 'destructive' }),
  });
}

export function useAddVisitVideo() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, url }: { visitId: string; url: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!isVideoUrl(url)) throw new Error('Please enter a valid YouTube or Vimeo URL');

      const { data, error } = await supabase.from('visit_media').insert({
        user_id: user.id,
        visit_id: visitId,
        url,
        media_type: 'video',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { visitId }) => {
      qc.invalidateQueries({ queryKey: ['visit-media', visitId] });
      toast({ title: 'Video added' });
    },
    onError: (err: Error) => toast({ title: 'Could not add video', description: err.message, variant: 'destructive' }),
  });
}

export function useDeleteVisitMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, visitId, storagePath }: { id: string; visitId: string; storagePath: string | null }) => {
      if (storagePath) {
        await supabase.storage.from('visit-media').remove([storagePath]);
      }
      const { error } = await supabase.from('visit_media').delete().eq('id', id);
      if (error) throw error;
      return visitId;
    },
    onSuccess: (visitId) => {
      qc.invalidateQueries({ queryKey: ['visit-media', visitId] });
    },
    onError: (err: Error) => toast({ title: 'Delete failed', description: err.message, variant: 'destructive' }),
  });
}
