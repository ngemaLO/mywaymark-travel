import { supabase } from '@/integrations/supabase/client';
import { FLAG_CDN_BASE_URL } from '@/lib/constants';

interface VisitLike {
  id: string;
  country_iso2: string;
}

export interface JourneyThumbnail<T extends VisitLike> {
  visit: T;
  imageUrl: string;
  isFlagFallback: boolean;
}

/** Resolves a display photo per visit: a personal visit photo, else a personal
 *  country photo, else a flag-tinted fallback so a card is never bare text. */
export async function attachJourneyThumbnails<T extends VisitLike>(visits: T[]): Promise<JourneyThumbnail<T>[]> {
  if (visits.length === 0) return [];

  const visitIds = visits.map(v => v.id);
  const isos = [...new Set(visits.map(v => v.country_iso2))];

  const [{ data: visitPhotos }, { data: countryImages }] = await Promise.all([
    supabase
      .from('visit_media')
      .select('visit_id, url, created_at')
      .in('visit_id', visitIds)
      .eq('media_type', 'photo')
      .order('created_at', { ascending: true }),
    supabase
      .from('country_images')
      .select('country_iso2, image_url, created_at')
      .in('country_iso2', isos)
      .order('created_at', { ascending: true }),
  ]);

  const photoByVisit = new Map<string, string>();
  for (const p of visitPhotos ?? []) {
    if (!photoByVisit.has(p.visit_id)) photoByVisit.set(p.visit_id, p.url);
  }

  const imageByCountry = new Map<string, string>();
  for (const c of countryImages ?? []) {
    if (!imageByCountry.has(c.country_iso2)) imageByCountry.set(c.country_iso2, c.image_url);
  }

  return visits.map((visit) => {
    const personalPhoto = photoByVisit.get(visit.id) ?? imageByCountry.get(visit.country_iso2);
    if (personalPhoto) {
      return { visit, imageUrl: personalPhoto, isFlagFallback: false };
    }
    return {
      visit,
      imageUrl: `${FLAG_CDN_BASE_URL}${visit.country_iso2.toLowerCase()}.png`,
      isFlagFallback: true,
    };
  });
}
