import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const body = await req.json();
    const { lat, lon } = body;
    const radius = Math.min(Math.max(Number(body.radius) || 1000, 100), 5000);
    if (typeof lat !== "number" || typeof lon !== "number") {
      return new Response(JSON.stringify({ error: "lat and lon are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Reverse geocode
    let locationName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "User-Agent": "Waymark Travel App contact@waymark.app" } }
      );
      if (nomRes.ok) {
        const nom = await nomRes.json();
        const a = nom.address ?? {};
        locationName = [
          a.neighbourhood || a.suburb,
          a.city || a.town || a.village || a.county,
          a.country,
        ].filter(Boolean).slice(0, 3).join(", ");
      }
    } catch {
      // use coordinate fallback
    }

    // 2. Query Overpass for real nearby places
    const overpassQuery = `
[out:json][timeout:12];
(
  node["name"]["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|museum|theatre|cinema|arts_centre|nightclub|library|marketplace)$"](around:${radius},${lat},${lon});
  node["name"]["tourism"~"^(attraction|viewpoint|museum|gallery|artwork|zoo|aquarium|theme_park)$"](around:${radius},${lat},${lon});
  node["name"]["historic"~"^(monument|ruins|castle|memorial|archaeological_site|building|fort|manor)$"](around:${radius},${lat},${lon});
  node["name"]["leisure"~"^(park|garden|nature_reserve|beach_resort|stadium|marina)$"](around:${radius},${lat},${lon});
  way["name"]["tourism"~"^(attraction|viewpoint|museum|gallery)$"](around:${radius},${lat},${lon});
  way["name"]["leisure"~"^(park|garden|nature_reserve)$"](around:${radius},${lat},${lon});
  way["name"]["historic"~"^(castle|ruins|monument|fort)$"](around:${radius},${lat},${lon});
);
out body center 40;
`;

    let rawPlaces: any[] = [];
    try {
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (overpassRes.ok) {
        const overpassData = await overpassRes.json();
        rawPlaces = (overpassData.elements ?? [])
          .filter((el: any) => el.tags?.name)
          .map((el: any) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            return {
              name: el.tags.name,
              amenity: el.tags.amenity,
              tourism: el.tags.tourism,
              historic: el.tags.historic,
              leisure: el.tags.leisure,
              cuisine: el.tags.cuisine,
              lat: elLat,
              lon: elLon,
              distance_m: elLat && elLon ? haversine(lat, lon, elLat, elLon) : null,
            };
          })
          .filter((p: any) => p.lat && p.lon && p.distance_m !== null)
          .sort((a: any, b: any) => a.distance_m - b.distance_m)
          .slice(0, 30);
      }
    } catch {
      // proceed with empty list — Claude will use its knowledge
    }

    // 3. Ask Claude to curate (uses its own knowledge if OSM data is sparse)
    const hasRealData = rawPlaces.length >= 3;

    const systemPrompt = `You are an expert local travel guide creating genuine, useful recommendations for travellers.

${hasRealData
  ? "You have been given a list of REAL places from OpenStreetMap near the user's location. Only recommend places from this list — do not invent places not present in the data."
  : "OpenStreetMap data is sparse for this area. Use your knowledge to recommend real, specific places near the given coordinates and location name. Be honest that these are based on your training knowledge."
}

Return valid JSON only — no markdown, no code fences. Use this exact structure:
{
  "location_label": "Short human-friendly label, e.g. 'Soho, London' or 'Shibuya, Tokyo'",
  "data_source": "${hasRealData ? "openstreetmap" : "ai_knowledge"}",
  "places": [
    {
      "name": "Place name",
      "category": "food_drink | culture | outdoors | entertainment",
      "type": "Human-readable type, e.g. 'Café', 'City Park', 'History Museum'",
      "description": "1-2 sentences that make a traveller want to visit. Be specific and evocative — mention what makes it special.",
      "distance_m": <integer, from input data if available, otherwise your best estimate in metres>,
      "lat": <number>,
      "lon": <number>,
      "hidden_gem": <true if lesser-known and off the tourist trail, false if well-known>,
      "tags": ["2-3 short tags e.g. 'Historic', 'Dog-friendly', 'Local favourite', 'Great views']
    }
  ]
}

Rules:
- Return 8-12 places, diverse across categories
- Prioritise walkable distance (nearest first)
- hidden_gem: true = genuinely off the beaten path
- Keep descriptions vivid but practical`;

    const userMessage = hasRealData
      ? `Location: ${locationName}\nCoordinates: ${lat}, ${lon}\n\nReal nearby places from OpenStreetMap:\n${JSON.stringify(rawPlaces, null, 2)}`
      : `Location: ${locationName}\nCoordinates: ${lat}, ${lon}\n\nOpenStreetMap returned very few results. Please recommend real places you know in this area based on your training knowledge.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const rawContent = aiData.content?.[0]?.text ?? "{}";
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({
        location_label: parsed.location_label ?? locationName,
        data_source: parsed.data_source ?? (hasRealData ? "openstreetmap" : "ai_knowledge"),
        places: Array.isArray(parsed.places) ? parsed.places : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("discover-nearby error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
