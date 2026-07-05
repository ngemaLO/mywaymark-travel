import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

function timeOrder(a: { time: string }, b: { time: string }) {
  const order = { morning: 0, afternoon: 1, evening: 2 };
  return (order[a.time as keyof typeof order] ?? 0) - (order[b.time as keyof typeof order] ?? 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let itinerary_id: string | null = null;
  let mode = "chat";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    supabase = createClient(
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
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const body = await req.json();
    itinerary_id = body.itinerary_id;
    mode = body.mode ?? "chat";

    if (!itinerary_id) {
      return new Response(JSON.stringify({ error: "itinerary_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: itinerary, error: itinError } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", itinerary_id)
      .eq("user_id", user.id)
      .single();

    if (itinError || !itinerary) {
      return new Response(JSON.stringify({ error: "Itinerary not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tripDays = Math.ceil(
      (new Date(itinerary.end_date).getTime() - new Date(itinerary.start_date).getTime()) / 86400000
    ) + 1;

    const prefs = itinerary.preferences ?? {};
    const styleLabel = Array.isArray(prefs.style) ? prefs.style.join(" + ") : prefs.style;
    const prefSummary = [
      styleLabel && `Travel style: ${styleLabel}`,
      prefs.budget && `Budget: ${prefs.budget}`,
      prefs.group && `Travelling as: ${prefs.group}`,
      prefs.pace && `Pace: ${prefs.pace}`,
    ].filter(Boolean).join(", ") || "No preferences specified";

    // ── SKELETON MODE ────────────────────────────────────────────────────────
    if (mode === "skeleton") {
      const FREE_LIMIT = 2;
      const isPro = user.app_metadata?.is_premium === true || user.user_metadata?.is_premium === true;
      let usedCount = 0;

      if (!isPro) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("ai_generations_used, ai_generations_reset_at")
          .eq("user_id", user.id)
          .single();

        usedCount = profileData?.ai_generations_used ?? 0;
        const resetAt = profileData?.ai_generations_reset_at
          ? new Date(profileData.ai_generations_reset_at)
          : new Date();
        const now = new Date();

        if (now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth()) {
          usedCount = 0;
          await supabase.from("profiles")
            .update({ ai_generations_used: 0, ai_generations_reset_at: now.toISOString() })
            .eq("user_id", user.id);
        }

        if (usedCount >= FREE_LIMIT) {
          return new Response(
            JSON.stringify({ error: "generation_limit_reached", used: usedCount, limit: FREE_LIMIT }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await supabase.from("itineraries").update({ status: "generating" }).eq("id", itinerary_id);

      const skeletonPrompt = `Create a ${tripDays}-day skeleton itinerary for ${itinerary.destination} (${itinerary.start_date} to ${itinerary.end_date}).
Preferences: ${prefSummary}.

Return ONLY valid JSON, no markdown, no code fences:
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "location": "Specific neighbourhood or area",
      "title": "Short evocative day theme",
      "activities": [
        { "time": "morning", "title": "Activity name", "description": "1-2 sentences with a real place name" }
      ]
    }
  ]
}

Rules:
- Exactly ${tripDays} days, numbered 1 to ${tripDays}
- Exactly ONE activity per day (the single best anchor activity for that day)
- Pace '${prefs.pace ?? "balanced"}': relaxed=cultural/slow, balanced=mix, packed=maximum sights
- Title should be evocative, e.g. "Temples and Twilight"
- No tips, no metadata, no hotels, no extra fields`;

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 2000, messages: [{ role: "user", content: skeletonPrompt }] }),
      });

      if (!aiRes.ok) {
        await supabase.from("itineraries").update({ status: "failed" }).eq("id", itinerary_id);
        throw new Error(`Anthropic error: ${aiRes.status}`);
      }

      const aiData = await aiRes.json();
      const raw = aiData.content?.[0]?.text ?? "{}";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const skeletonContent = Array.isArray(parsed.itinerary) ? parsed.itinerary : [];

      await supabase.from("itineraries").update({
        content: skeletonContent,
        metadata: { builder_phase: "skeleton" },
        status: "ready",
      }).eq("id", itinerary_id);

      if (!isPro) {
        await supabase.from("profiles")
          .update({ ai_generations_used: usedCount + 1 })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ itinerary: skeletonContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SLOT OPTIONS MODE ─────────────────────────────────────────────────────
    if (mode === "slot_options") {
      const slot = body.slot as { day: number; time: string } | undefined;
      if (!slot?.day || !slot?.time) {
        return new Response(JSON.stringify({ error: "slot.day and slot.time are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const dayData = itinerary.content?.find((d: any) => d.day === slot.day);
      const anchor = dayData?.activities?.[0];
      const date = dayData?.date ?? "";

      const optionsPrompt = `For Day ${slot.day} (${date}) in ${itinerary.destination}, suggest 3 alternative ${slot.time} activities.
Trip preferences: ${prefSummary}.
${anchor ? `The anchor activity for this day is "${anchor.title}" — suggest activities that complement it.` : ""}

Return ONLY valid JSON, no markdown:
{
  "options": [
    { "title": "Activity name", "description": "1-2 sentences with real place details", "website": "URL if certain, else omit", "booking_url": "URL if certain, else omit" },
    { ... },
    { ... }
  ]
}`;

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 800, messages: [{ role: "user", content: optionsPrompt }] }),
      });

      if (!aiRes.ok) throw new Error(`Anthropic error: ${aiRes.status}`);

      const aiData = await aiRes.json();
      const raw = aiData.content?.[0]?.text ?? "{}";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      return new Response(
        JSON.stringify({ options: Array.isArray(parsed.options) ? parsed.options : [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── COMPLETE MODE ─────────────────────────────────────────────────────────
    if (mode === "complete") {
      const current_content = body.current_content;
      if (!Array.isArray(current_content) || current_content.length === 0) {
        return new Response(JSON.stringify({ error: "current_content array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("itineraries").update({ status: "generating" }).eq("id", itinerary_id);

      const { data: visits = [] } = await supabase
        .from("visits")
        .select("country_iso2, arrival_date, departure_date")
        .eq("user_id", user.id)
        .order("arrival_date", { ascending: false })
        .limit(50);

      const visitedCountries = [...new Set(visits.map((v: any) => v.country_iso2))];
      const hasBeenBefore = itinerary.destination_iso2 && visitedCountries.includes(itinerary.destination_iso2);

      const systemPrompt = `You are an expert travel planner creating personalised, practical itineraries. You have deep knowledge of global destinations, neighbourhoods, local culture, transport, hotels, and seasonal weather.
${hasBeenBefore ? `The user has visited ${itinerary.destination} before — suggest going deeper, off-the-beaten-path.` : `First time in ${itinerary.destination} — include orientation, classic highlights, and practical first-timer tips.`}
CRITICAL: Respond with valid JSON only — no markdown, no code fences, no extra text.`;

      const completePrompt = `Complete this partial itinerary for ${itinerary.destination} (${tripDays} days, ${itinerary.start_date} to ${itinerary.end_date}).
User preferences: ${prefSummary}.

Rules:
- Each day MUST have exactly 3 activities: one morning, one afternoon, one evening
- If an activity already exists for a time slot, keep it EXACTLY as-is — do not change any field
- Only fill the missing time slots
- Return the FULL itinerary (all ${tripDays} days) plus complete accommodation, transport, and weather metadata

Current partial itinerary (preserve all existing activities):
${JSON.stringify(current_content)}

Use this exact JSON structure:
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "location": "City or neighbourhood",
      "title": "Short evocative day theme",
      "activities": [
        { "time": "morning", "title": "...", "description": "...", "website": "...", "booking_url": "...", "booking_required": true, "phone": "..." }
      ],
      "tips": "One practical tip for this day"
    }
  ],
  "metadata": {
    "accommodation": {
      "areas": [{ "name": "...", "description": "...", "best_for": "...", "price_range": "$" }],
      "hotels": [{ "name": "...", "area": "...", "type": "...", "price_range": "...", "why": "...", "website": "...", "booking_url": "..." }]
    },
    "transport": {
      "summary": "...",
      "options": [{ "type": "...", "description": "...", "cost": "...", "tip": "...", "website": "..." }]
    },
    "weather": {
      "summary": "...",
      "temperature": "15–25°C",
      "conditions": "...",
      "what_to_pack": ["Item 1", "Item 2"]
    }
  }
}`;

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: "user", content: completePrompt }],
        }),
      });

      if (!aiRes.ok) {
        await supabase.from("itineraries").update({ status: "failed" }).eq("id", itinerary_id);
        throw new Error(`Anthropic error: ${aiRes.status}`);
      }

      const aiData = await aiRes.json();
      const raw = aiData.content?.[0]?.text ?? "{}";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      const fullContent = Array.isArray(parsed.itinerary) ? parsed.itinerary : current_content;
      const metadata = { ...(parsed.metadata ?? {}), builder_phase: "complete" };

      await supabase.from("itineraries").update({
        content: fullContent,
        metadata,
        status: "ready",
      }).eq("id", itinerary_id);

      return new Response(
        JSON.stringify({ itinerary: fullContent, metadata }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CHAT MODE (default) ───────────────────────────────────────────────────
    const user_message = body.user_message;

    if (typeof user_message !== "string" || user_message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "user_message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user_message.length > 2000) {
      return new Response(JSON.stringify({ error: "user_message too long (max 2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages = [] } = await supabase
      .from("itinerary_messages")
      .select("role, content")
      .eq("itinerary_id", itinerary_id)
      .order("created_at", { ascending: true });

    const { data: visits = [] } = await supabase
      .from("visits")
      .select("country_iso2, arrival_date, departure_date")
      .eq("user_id", user.id)
      .order("arrival_date", { ascending: false })
      .limit(50);

    const visitedCountries = [...new Set(visits.map((v: any) => v.country_iso2))];
    const tripCount = visits.length;
    const durations = visits
      .filter((v: any) => v.departure_date)
      .map((v: any) => Math.ceil(
        (new Date(v.departure_date).getTime() - new Date(v.arrival_date).getTime()) / 86400000
      ));
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : 14;

    const hasBeenBefore = itinerary.destination_iso2 && visitedCountries.includes(itinerary.destination_iso2);

    const systemPrompt = `You are an expert travel planner creating personalised, practical itineraries. You have deep knowledge of global destinations, neighbourhoods, local culture, transport, hotels, and seasonal weather.

User's travel profile:
- Countries visited: ${visitedCountries.length > 0 ? visitedCountries.join(", ") : "No trips logged yet"}
- Total trips logged: ${tripCount}
- Average trip duration: ${avgDuration} days
${hasBeenBefore ? `- They have visited ${itinerary.destination} before — suggest going deeper, off-the-beaten-path, or revisiting favourites with new eyes.` : `- First time in ${itinerary.destination} — include orientation, classic highlights, and practical first-timer tips.`}

Trip being planned:
- Destination: ${itinerary.destination}
- Dates: ${itinerary.start_date} to ${itinerary.end_date} (${tripDays} days)
- User preferences: ${prefSummary}
- Current itinerary: ${JSON.stringify(itinerary.content)}
- Current metadata: ${JSON.stringify(itinerary.metadata)}

CRITICAL: Respond with valid JSON only — no markdown, no code fences, no extra text. Use this exact structure:

{
  "message": "Conversational response to the user — friendly, specific, explain what you planned or changed",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "location": "City or neighbourhood",
      "title": "Short evocative day theme",
      "activities": [
        {
          "time": "morning",
          "title": "Activity name",
          "description": "1-2 sentences with practical detail — name real places",
          "website": "Official website URL if you are certain it is correct, otherwise omit",
          "booking_url": "Direct booking/tickets URL if you are certain it is correct, otherwise omit",
          "booking_required": true,
          "phone": "+XX XXX XXX XXXX if you are certain it is correct, otherwise omit"
        }
      ],
      "tips": "One practical tip for this day"
    }
  ],
  "metadata": {
    "accommodation": {
      "areas": [{ "name": "...", "description": "...", "best_for": "...", "price_range": "$" }],
      "hotels": [{ "name": "...", "area": "...", "type": "...", "price_range": "...", "why": "...", "website": "...", "booking_url": "...", "phone": "..." }]
    },
    "transport": {
      "summary": "...",
      "options": [{ "type": "...", "description": "...", "cost": "...", "tip": "...", "website": "..." }]
    },
    "weather": {
      "summary": "...",
      "temperature": "15–25°C (59–77°F)",
      "conditions": "...",
      "what_to_pack": ["Item 1", "Item 2", "Item 3"]
    }
  }
}

Rules for the itinerary:
- Generate all ${tripDays} days
- Group nearby areas to minimise unnecessary travel
- Rest day every 7+ days
- Mix culture, food, nature, and local experience
- Name actual places, markets, temples, beaches, dishes
- Respect the user's travel style and budget preferences

Rules for metadata:
- Always include 3-5 accommodation areas, ranked from most to least recommended for this trip
- Always include 4-6 hotel suggestions matched to the budget preference
- Always include the main transport options (3-5 options)
- Weather should reflect the actual dates and destination — be specific about season and conditions`;

    const conversationMessages = [
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: user_message },
    ];

    await supabase.from("itinerary_messages").insert({
      itinerary_id,
      user_id: user.id,
      role: "user",
      content: user_message,
    });

    await supabase.from("itineraries").update({ status: "generating" }).eq("id", itinerary_id);

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        messages: conversationMessages,
      }),
    });

    if (!aiResponse.ok) {
      await supabase.from("itineraries").update({ status: "failed" }).eq("id", itinerary_id);
      const errBody = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${aiResponse.status} — ${errBody}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.content?.[0]?.text ?? "{}";
    const cleanedContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleanedContent);

    const assistantMessage = parsed.message ?? "Here's your updated itinerary.";
    const itineraryContent = Array.isArray(parsed.itinerary) ? parsed.itinerary : [];
    const metadata = parsed.metadata && typeof parsed.metadata === "object"
      ? { ...parsed.metadata, builder_phase: "complete" }
      : { builder_phase: "complete" };

    await Promise.all([
      supabase.from("itinerary_messages").insert({
        itinerary_id,
        user_id: user.id,
        role: "assistant",
        content: assistantMessage,
      }),
      supabase.from("itineraries").update({ content: itineraryContent, metadata, status: "ready" }).eq("id", itinerary_id),
    ]);

    return new Response(
      JSON.stringify({ message: assistantMessage, itinerary: itineraryContent, metadata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-itinerary error:", error);
    if (supabase && itinerary_id && mode !== "slot_options") {
      await supabase.from("itineraries").update({ status: "failed" }).eq("id", itinerary_id).catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
