import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateTripSummaryRequest {
  trip_id: string;
  regenerate?: boolean;
}

interface TripRow {
  id: string;
  user_id: string;
  title: string | null;
  start_date: string;
  end_date: string | null;
  is_travel: boolean;
}

interface VisitRow {
  id: string;
  country_iso2: string;
  arrival_date: string;
  departure_date: string | null;
  place_id: string | null;
}

interface CountryRow {
  iso2: string;
  name: string;
}

interface ParsedSummaryResponse {
  title?: string;
  summary?: string;
  highlights?: string[];
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function parseSummaryResponse(content: string): ParsedSummaryResponse {
  try {
    const parsed = JSON.parse(content) as ParsedSummaryResponse;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("AI response was not a valid object");
    }
    return parsed;
  } catch (error) {
    throw new Error("AI response was not valid JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = (await req.json()) as GenerateTripSummaryRequest;
    const tripId = body.trip_id;
    const regenerate = body.regenerate ?? false;

    if (!tripId) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, user_id, title, start_date, end_date, is_travel")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("id, country_iso2, arrival_date, departure_date, place_id")
      .eq("user_id", userId)
      .eq("trip_id", tripId)
      .order("arrival_date", { ascending: true });

    if (visitsError) {
      throw visitsError;
    }

    if (!visits || visits.length === 0) {
      return new Response(JSON.stringify({ error: "Trip has no linked visits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tripRow = trip as TripRow;
    const visitRows = visits as VisitRow[];
    const countryIsos = [...new Set(visitRows.map((visit) => visit.country_iso2))];

    const { data: countries, error: countriesError } = await supabase
      .from("countries")
      .select("iso2, name")
      .in("iso2", countryIsos);

    if (countriesError) {
      throw countriesError;
    }

    const countryMap = new Map((countries as CountryRow[]).map((country) => [country.iso2, country.name]));
    const periodStart = visitRows[0].arrival_date;
    const periodEnd = tripRow.end_date || visitRows[visitRows.length - 1].departure_date || new Date().toISOString().split("T")[0];

    let longestStayCountryIso = visitRows[0].country_iso2;
    let longestStayDays = 0;
    let totalVisitDays = 0;

    for (const visit of visitRows) {
      const visitEnd = visit.departure_date || periodEnd;
      const durationDays = daysBetween(visit.arrival_date, visitEnd);
      totalVisitDays += durationDays;
      if (durationDays > longestStayDays) {
        longestStayDays = durationDays;
        longestStayCountryIso = visit.country_iso2;
      }
    }

    const statsSnapshot = {
      countries_count: countryIsos.length,
      visit_count: visitRows.length,
      duration_days: daysBetween(periodStart, periodEnd),
      longest_stay_days: longestStayDays,
      longest_stay_country: longestStayCountryIso,
      is_completed: !!tripRow.end_date,
    };

    const sourceContext = {
      trip_title: tripRow.title,
      countries: countryIsos.map((iso) => ({
        iso2: iso,
        name: countryMap.get(iso) || iso,
      })),
      date_range: {
        start: periodStart,
        end: periodEnd,
      },
    };

    const existingSummaryQuery = await supabase
      .from("trip_summaries")
      .select("id, version")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSummaryQuery.error) {
      throw existingSummaryQuery.error;
    }

    if (existingSummaryQuery.data && !regenerate) {
      const { data: currentSummary, error: currentSummaryError } = await supabase
        .from("trip_summaries")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .single();

      if (currentSummaryError) throw currentSummaryError;

      return new Response(JSON.stringify({ summary: currentSummary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const countryNames = countryIsos.map((iso) => countryMap.get(iso) || iso);
    const tripLabel = tripRow.title?.trim() || (countryNames.length === 1 ? countryNames[0] : "This trip");
    const systemPrompt =
      "You write concise travel recaps. Keep the tone warm, clear, and grounded in the trip data. Avoid purple prose, bullet lists, and hype. Use 2 short paragraphs at most.";
    const userPrompt = `Write a trip summary for a traveller.

Trip title: ${tripLabel}
Trip dates: ${periodStart} to ${periodEnd}
Countries visited: ${countryNames.join(", ")}
Visit count: ${visitRows.length}
Duration: ${statsSnapshot.duration_days} days
Longest stay: ${countryMap.get(longestStayCountryIso) || longestStayCountryIso} (${longestStayDays} days)
Trip status: ${tripRow.end_date ? "completed" : "ongoing"}

Return valid JSON with this exact shape:
{
  "title": "short title",
  "summary": "80-140 word summary",
  "highlights": ["short highlight", "short highlight", "short highlight"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to generate trip summary");
    }

    const aiPayload = await aiResponse.json();
    const content = aiPayload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI response did not contain summary content");
    }

    const parsed = parseSummaryResponse(content);

    const title = parsed.title?.trim() || tripLabel;
    const summary = parsed.summary?.trim();
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((item) => typeof item === "string").slice(0, 3)
      : [];

    if (!summary) {
      throw new Error("AI response did not contain a summary");
    }

    const nextVersion = existingSummaryQuery.data
      ? existingSummaryQuery.data.version + 1
      : 1;

    const payload = {
      user_id: userId,
      trip_id: tripId,
      period_start: periodStart,
      period_end: periodEnd,
      title,
      summary,
      highlights,
      stats_snapshot: statsSnapshot,
      source_context: sourceContext,
      status: "ready",
      error_message: null,
      model: "google/gemini-3-flash-preview",
      version: nextVersion,
      generated_at: new Date().toISOString(),
    };

    const mutation = await supabase
      .from("trip_summaries")
      .upsert(payload, {
        onConflict: "trip_id",
      })
      .select("*")
      .single();

    if (mutation.error) {
      throw mutation.error;
    }

    return new Response(JSON.stringify({ summary: mutation.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating trip summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
