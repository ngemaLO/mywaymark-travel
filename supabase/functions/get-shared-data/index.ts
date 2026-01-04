import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      console.log('Invalid token provided');
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS for controlled data access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the share link token
    console.log('Validating share token...');
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();

    if (linkError) {
      console.error('Error fetching share link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shareLink) {
      console.log('Share link not found or inactive');
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive share link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      console.log('Share link has expired');
      return new Response(
        JSON.stringify({ error: 'Share link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = shareLink.user_id;
    console.log(`Fetching data for user: ${userId} with scopes: map=${shareLink.scope_map}, stats=${shareLink.scope_stats}, timeline=${shareLink.scope_timeline}, notes=${shareLink.scope_notes}, images=${shareLink.scope_images}`);

    const result: {
      shareLink: typeof shareLink;
      visits: unknown[];
      notes: unknown[];
      images: unknown[];
      trips: unknown[];
      flights: number;
    } = {
      shareLink,
      visits: [],
      notes: [],
      images: [],
      trips: [],
      flights: 0,
    };

    // Always fetch visits (needed for map, stats, badges)
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', userId);
    
    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
    } else {
      result.visits = visits || [];
    }

    // Fetch notes if scope allows
    if (shareLink.scope_notes) {
      const { data: notes, error: notesError } = await supabase
        .from('country_notes')
        .select('*')
        .eq('user_id', userId);
      
      if (notesError) {
        console.error('Error fetching notes:', notesError);
      } else {
        result.notes = notes || [];
      }
    }

    // Fetch images if scope allows
    if (shareLink.scope_images) {
      const { data: images, error: imagesError } = await supabase
        .from('country_images')
        .select('*')
        .eq('user_id', userId);
      
      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      } else {
        result.images = images || [];
      }
    }

    // Fetch trips if timeline scope
    if (shareLink.scope_timeline) {
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      
      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
      } else {
        result.trips = trips || [];
      }
    }

    // Fetch flight count for stats
    if (shareLink.scope_stats) {
      const { count, error: flightsError } = await supabase
        .from('flights')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (flightsError) {
        console.error('Error fetching flight count:', flightsError);
      } else {
        result.flights = count || 0;
      }
    }

    console.log(`Successfully fetched shared data: ${result.visits.length} visits, ${result.notes.length} notes, ${result.images.length} images, ${result.trips.length} trips`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
