import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Entry {
  country_iso2: string;
  start_date: string;
  end_date: string;
  country_name?: string;
}

interface Signal {
  type: 'returning_place' | 'first_visit' | 'long_stay' | 'seasonal_pattern' | 'home_base';
  reference: string;
}

interface GenerateLetterRequest {
  scope: 'year' | 'chapter' | 'custom';
  period_start: string;
  period_end: string;
  entries: Entry[];
  home_base_country?: string;
  lifetime_countries?: string[];
}

// Theme selection based on entry patterns
function selectTheme(
  entries: Entry[],
  repeats: Map<string, number>,
  lifetimeCountries: Set<string>,
  averageDuration: number
): string {
  const uniqueCountries = new Set(entries.map(e => e.country_iso2));
  const newCountries = [...uniqueCountries].filter(c => !lifetimeCountries.has(c));
  const repeatCount = [...repeats.values()].filter(v => v > 1).length;

  // Priority-based theme selection
  if (repeatCount >= Math.ceil(uniqueCountries.size * 0.4)) {
    return "A year of returning";
  }
  if (newCountries.length >= Math.ceil(uniqueCountries.size * 0.6)) {
    return "A year of firsts";
  }
  if (entries.length <= 3 && averageDuration > 30) {
    return "A year of staying";
  }
  if (entries.length <= 2) {
    return "A quieter year";
  }
  if (entries.length >= 6 && averageDuration < 14) {
    return "A year in motion";
  }

  return "A year of journeys";
}

// Select supporting signals
function selectSignals(
  entries: Entry[],
  repeats: Map<string, number>,
  lifetimeCountries: Set<string>,
  homeBase: string | null
): Signal[] {
  const signals: Signal[] = [];
  const uniqueCountries = new Set(entries.map(e => e.country_iso2));

  // Returning places
  for (const [country, count] of repeats) {
    if (count > 1 && signals.length < 5) {
      signals.push({ type: 'returning_place', reference: country });
    }
  }

  // First visits
  for (const country of uniqueCountries) {
    if (!lifetimeCountries.has(country) && signals.length < 5) {
      signals.push({ type: 'first_visit', reference: country });
    }
  }

  // Long stays (> 21 days)
  for (const entry of entries) {
    const duration = Math.ceil(
      (new Date(entry.end_date).getTime() - new Date(entry.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (duration > 21 && signals.length < 5) {
      signals.push({ type: 'long_stay', reference: entry.country_iso2 });
      break;
    }
  }

  // Home base signal
  if (homeBase && [...uniqueCountries].includes(homeBase)) {
    signals.push({ type: 'home_base', reference: homeBase });
  }

  return signals.slice(0, 5);
}

// Get season label for a month
function getSeasonLabel(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: GenerateLetterRequest = await req.json();
    const { scope, period_start, period_end, entries, home_base_country, lifetime_countries = [] } = body;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No entries provided for this period" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute metrics
    const lifetimeSet = new Set(lifetime_countries);
    const countryVisits = new Map<string, number>();
    let totalDays = 0;
    let maxDuration = 0;
    let longestStayCountry = '';

    for (const entry of entries) {
      const country = entry.country_iso2;
      countryVisits.set(country, (countryVisits.get(country) || 0) + 1);

      const duration = Math.ceil(
        (new Date(entry.end_date).getTime() - new Date(entry.start_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      totalDays += duration;
      if (duration > maxDuration) {
        maxDuration = duration;
        longestStayCountry = country;
      }
    }

    const averageDuration = totalDays / entries.length;
    const theme = selectTheme(entries, countryVisits, lifetimeSet, averageDuration);
    const signals = selectSignals(entries, countryVisits, lifetimeSet, home_base_country || null);

    // Build stats snapshot
    const statsSnapshot = {
      countries_count: countryVisits.size,
      entries_count: entries.length,
      total_days: totalDays,
      longest_stay_days: maxDuration,
      longest_stay_country: longestStayCountry,
      new_countries: [...countryVisits.keys()].filter(c => !lifetimeSet.has(c)),
    };

    // Generate year label
    const startYear = new Date(period_start).getFullYear();
    const endYear = new Date(period_end).getFullYear();
    const yearLabel = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;

    // Create title
    const title = scope === 'year' 
      ? `${yearLabel} — ${theme.replace('A year', 'A Year')}`
      : scope === 'chapter'
      ? theme.replace('A year', 'A Chapter')
      : theme.replace('A year', 'A Time');

    // Build the prompt for AI
    const signalDescriptions = signals.map(s => {
      const name = entries.find(e => e.country_iso2 === s.reference)?.country_name || s.reference;
      switch (s.type) {
        case 'returning_place': return `Returned to ${name} multiple times`;
        case 'first_visit': return `First time visiting ${name}`;
        case 'long_stay': return `Extended stay in ${name}`;
        case 'home_base': return `Returned to home base (${name})`;
        case 'seasonal_pattern': return `Traveled predominantly in ${s.reference}`;
        default: return '';
      }
    }).filter(Boolean);

    const countryNames = entries.map(e => e.country_name || e.country_iso2).join(', ');

    const systemPrompt = `You are a reflective travel journal writer. Your tone is warm, contemplative, and poetic — never analytical or list-like. You write as if composing a letter to someone about their travels. 

Rules:
- No bullet points or lists
- Use "perhaps", "it seems", "it felt like" — avoid certainty about emotions
- Minimal numbers — use them only if poetic ("three continents", not "12 entries")
- No advice or judgement
- Write in second person ("You...")
- Keep it under 150 words
- Structure: Opening line → Theme statement → 2-3 observations → Closing line`;

    const userPrompt = `Write a reflective letter about this period of travel.

Theme: "${theme}"
Period: ${yearLabel}
Countries visited: ${countryNames}
Key observations: ${signalDescriptions.join('; ')}
Total places: ${countryVisits.size} countries across ${entries.length} entries

Write a short, poetic letter that captures the essence of this travel period. Focus on the theme "${theme}" and weave in the key observations naturally.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate letter");
    }

    const aiResponse = await response.json();
    const letterBody = aiResponse.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({
        title,
        subtitle: scope === 'year' ? 'A letter from your travels.' : null,
        theme,
        body: letterBody,
        supporting_signals: signals,
        stats_snapshot: statsSnapshot,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating letter:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});