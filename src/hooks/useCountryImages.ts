import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';

export interface CountryImage {
  id: string;
  user_id: string;
  country_iso2: string;
  image_url: string;
  thumb_url: string | null;
  created_at: string | null;
}

const MAX_IMAGES_PER_COUNTRY = 5;

export function useCountryImages(countryIso2: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['country-images', countryIso2, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('country_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CountryImage[];
    },
    enabled: !!user && !!countryIso2,
  });
}

export function useAddCountryImage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ countryIso2, imageUrl }: { countryIso2: string; imageUrl: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check current image count
      const { data: existingImages, error: countError } = await supabase
        .from('country_images')
        .select('id')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2);

      if (countError) throw countError;

      if (existingImages && existingImages.length >= MAX_IMAGES_PER_COUNTRY) {
        throw new Error(`Maximum of ${MAX_IMAGES_PER_COUNTRY} images per country reached`);
      }

      const { data, error } = await supabase
        .from('country_images')
        .insert({
          user_id: user.id,
          country_iso2: countryIso2,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['country-images', variables.countryIso2] });
      toast({ title: 'Image added', description: 'Your photo has been added successfully.' });
    },
    onError: (error) => {
      logError('useAddCountryImage', error);
      toast({
        title: 'Error adding image',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUploadCountryImage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ countryIso2, file }: { countryIso2: string; file: File }) => {
      if (!user) throw new Error('Not authenticated');

      // Check current image count
      const { data: existingImages, error: countError } = await supabase
        .from('country_images')
        .select('id')
        .eq('user_id', user.id)
        .eq('country_iso2', countryIso2);

      if (countError) throw countError;

      if (existingImages && existingImages.length >= MAX_IMAGES_PER_COUNTRY) {
        throw new Error(`Maximum of ${MAX_IMAGES_PER_COUNTRY} images per country reached`);
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${countryIso2}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('country-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('country-images')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      // Insert into DB
      const { data, error } = await supabase
        .from('country_images')
        .insert({
          user_id: user.id,
          country_iso2: countryIso2,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['country-images', variables.countryIso2] });
      toast({ title: 'Image uploaded', description: 'Your photo has been added successfully.' });
    },
    onError: (error) => {
      logError('useUploadCountryImage', error);
      toast({
        title: 'Error uploading image',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCountryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageId, countryIso2 }: { imageId: string; countryIso2: string }) => {
      // Fetch the row first so we can delete the storage object too
      const { data: row } = await supabase
        .from('country_images')
        .select('image_url')
        .eq('id', imageId)
        .single();

      const { error } = await supabase
        .from('country_images')
        .delete()
        .eq('id', imageId);
      if (error) throw error;

      // Best-effort storage cleanup for uploaded files
      if (row?.image_url) {
        const url = new URL(row.image_url);
        // Storage public URLs end with /object/public/<bucket>/<path>
        const match = url.pathname.match(/\/object\/public\/country-images\/(.+)$/);
        if (match) {
          await supabase.storage.from('country-images').remove([decodeURIComponent(match[1])]);
        }
      }

      return { imageId, countryIso2 };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['country-images', variables.countryIso2] });
      toast({ title: 'Image deleted', description: 'Your photo has been removed.' });
    },
    onError: (error) => {
      logError('useDeleteCountryImage', error);
      toast({
        title: 'Error deleting image',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function getMaxImagesPerCountry() {
  return MAX_IMAGES_PER_COUNTRY;
}
