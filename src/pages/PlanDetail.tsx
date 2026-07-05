import { useState, useRef, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  useItinerary,
  useItineraryMessages,
  useSendItineraryMessage,
  useResetItinerary,
} from '@/hooks/useItineraries';
import type {
  ItineraryActivity,
  ItineraryDay,
  ItineraryMetadata,
} from '@/hooks/useItineraries';
import {
  ArrowLeft,
  Send,
  Loader2,
  Sun,
  Sunset,
  Moon,
  MapPin,
  Hotel,
  Train,
  Cloud,
  Thermometer,
  Package,
  Banknote,
  ExternalLink,
  Phone,
  Ticket,
  Download,
} from 'lucide-react';
import { AiDisclaimer } from '@/components/AiDisclaimer';
import { ItineraryBuilder } from '@/components/ItineraryBuilder';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const timeIcon = { morning: Sun, afternoon: Sunset, evening: Moon } as const;

function LinkButton({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
    >
      <Icon className="w-3 h-3" />
      {label}
    </a>
  );
}

function mapsUrl(name: string, location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${location}`)}`;
}

function bookingSearchUrl(name: string, city: string) {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${name} ${city}`)}`;
}

function ActivityItem({ activity, location }: { activity: ItineraryActivity; location: string }) {
  const Icon = timeIcon[activity.time];
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">{activity.title}</p>
          {activity.booking_required && (
            <span className="text-xs text-orange-400 font-medium">Book ahead</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          {activity.website && (
            <LinkButton href={activity.website} icon={ExternalLink} label="Website" />
          )}
          {activity.booking_url && (
            <LinkButton href={activity.booking_url} icon={Ticket} label="Book tickets" />
          )}
          {!activity.website && !activity.booking_url && (
            <LinkButton href={mapsUrl(activity.title, location)} icon={MapPin} label="View on Maps" />
          )}
          {activity.phone && (
            <LinkButton href={`tel:${activity.phone}`} icon={Phone} label={activity.phone} />
          )}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: ItineraryDay }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Day {day.day}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{day.title}</h3>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {day.location}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(day.date), 'EEE, MMM d')}
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        {day.activities.map((act, i) => (
          <ActivityItem key={i} activity={act} location={day.location} />
        ))}
        {day.tips && (
          <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2 mt-2">
            Tip: {day.tips}
          </p>
        )}
      </div>
    </div>
  );
}

function StayTab({ metadata }: { metadata: ItineraryMetadata }) {
  const { accommodation } = metadata;
  if (!accommodation) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Generate your itinerary to see accommodation recommendations.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {accommodation.areas?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Best areas to stay
          </h3>
          {accommodation.areas.map((area, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{area.name}</p>
                <span className="text-xs text-muted-foreground">{area.price_range}</span>
              </div>
              <p className="text-xs text-muted-foreground">{area.description}</p>
              <p className="text-xs text-primary/80">Best for: {area.best_for}</p>
            </div>
          ))}
        </div>
      )}

      {accommodation.hotels?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Hotel className="w-4 h-4 text-primary" />
              Suggested hotels
            </h3>
            <span className="text-xs text-muted-foreground/60">Verify links before booking</span>
          </div>
          {accommodation.hotels.map((hotel, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{hotel.name}</p>
                  <p className="text-xs text-muted-foreground">{hotel.area} · {hotel.type}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Banknote className="w-3 h-3" />
                  {hotel.price_range}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{hotel.why}</p>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                {hotel.website && (
                  <LinkButton href={hotel.website} icon={ExternalLink} label="Website" />
                )}
                {hotel.booking_url ? (
                  <LinkButton href={hotel.booking_url} icon={Ticket} label="Book now" />
                ) : (
                  <LinkButton href={bookingSearchUrl(hotel.name, hotel.area)} icon={Ticket} label="Search on Booking.com" />
                )}
                {hotel.phone && (
                  <LinkButton href={`tel:${hotel.phone}`} icon={Phone} label={hotel.phone} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransportTab({ metadata }: { metadata: ItineraryMetadata }) {
  const { transport } = metadata;
  if (!transport) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Generate your itinerary to see transport information.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {transport.summary && (
        <p className="text-sm text-muted-foreground">{transport.summary}</p>
      )}
      <div className="space-y-3">
        {transport.options?.map((opt, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">{opt.type}</p>
              </div>
              {opt.cost && (
                <span className="text-xs text-muted-foreground">{opt.cost}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{opt.description}</p>
            {opt.tip && (
              <p className="text-xs text-primary/80 italic">Tip: {opt.tip}</p>
            )}
            {opt.website && (
              <div className="pt-0.5">
                <LinkButton href={opt.website} icon={ExternalLink} label="Official site" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherTab({ metadata, destination, startDate, endDate }: {
  metadata: ItineraryMetadata;
  destination: string;
  startDate: string;
  endDate: string;
}) {
  const { weather } = metadata;
  if (!weather) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Generate your itinerary to see weather information.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            {destination} · {format(new Date(startDate), 'MMM d')}–{format(new Date(endDate), 'MMM d')}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{weather.summary}</p>
        <div className="flex items-center gap-2 text-sm">
          <Thermometer className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{weather.temperature}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{weather.conditions}</span>
        </div>
      </div>

      {weather.what_to_pack?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            What to pack
          </h3>
          <div className="flex flex-wrap gap-2">
            {weather.what_to_pack.map((item, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-xs bg-muted/40 border border-border/50 text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: itinerary, isLoading: loadingItinerary } = useItinerary(id);
  const { data: messages = [], isLoading: loadingMessages } = useItineraryMessages(id);
  const sendMessage = useSendItineraryMessage();
  const resetItinerary = useResetItinerary();

  if (!user) return <Navigate to="/auth" replace />;

  const isGenerating = itinerary?.status === 'generating' || sendMessage.isPending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isGenerating || !id) return;
    setInput('');
    sendMessage.mutate({ itineraryId: id, message: text });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = () => {
    if (!itinerary) return;
    const { destination, start_date, end_date, content, metadata } = itinerary;
    const dateRange = `${format(new Date(start_date), 'MMM d')} – ${format(new Date(end_date), 'MMM d, yyyy')}`;

    const dayRows = content.map(day => `
      <div class="day">
        <div class="day-header">
          <div>
            <span class="day-label">Day ${day.day}</span>
            <h3>${day.title}</h3>
          </div>
          <div class="day-meta">
            <span>📍 ${day.location}</span>
            <span>${format(new Date(day.date), 'EEE, MMM d')}</span>
          </div>
        </div>
        <div class="activities">
          ${day.activities.map(a => `
            <div class="activity">
              <span class="time-icon">${a.time === 'morning' ? '🌅' : a.time === 'afternoon' ? '🌤' : '🌙'}</span>
              <div>
                <strong>${a.title}</strong>${a.booking_required ? ' <span class="badge">Book ahead</span>' : ''}
                <p>${a.description}</p>
              </div>
            </div>
          `).join('')}
          ${day.tips ? `<p class="tip">💡 ${day.tips}</p>` : ''}
        </div>
      </div>
    `).join('');

    const accomHtml = metadata?.accommodation ? `
      <h2>Where to Stay</h2>
      ${(metadata.accommodation.areas || []).map(a => `
        <div class="card">
          <strong>${a.name}</strong> <span class="muted">${a.price_range || ''}</span>
          <p>${a.description}</p>
          <p class="highlight">Best for: ${a.best_for}</p>
        </div>
      `).join('')}
      <h3>Suggested Hotels</h3>
      ${(metadata.accommodation.hotels || []).map(h => `
        <div class="card">
          <strong>${h.name}</strong> · ${h.area} · ${h.type} <span class="muted">${h.price_range || ''}</span>
          <p>${h.why}</p>
        </div>
      `).join('')}
    ` : '';

    const transportHtml = metadata?.transport ? `
      <h2>Getting Around</h2>
      <p>${metadata.transport.summary || ''}</p>
      ${(metadata.transport.options || []).map(o => `
        <div class="card">
          <strong>${o.type}</strong> <span class="muted">${o.cost || ''}</span>
          <p>${o.description}</p>
          ${o.tip ? `<p class="highlight">Tip: ${o.tip}</p>` : ''}
        </div>
      `).join('')}
    ` : '';

    const weatherHtml = metadata?.weather ? `
      <h2>Weather</h2>
      <div class="card">
        <strong>${metadata.weather.temperature}</strong> · ${metadata.weather.conditions}
        <p>${metadata.weather.summary}</p>
        ${(metadata.weather.what_to_pack || []).length > 0 ? `
          <p><strong>What to pack:</strong> ${metadata.weather.what_to_pack.join(', ')}</p>
        ` : ''}
      </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${destination} Itinerary – ${dateRange}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 820px; margin: 0 auto; }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 16px; font-weight: 600; margin: 28px 0 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
    h3 { font-size: 14px; font-weight: 600; margin: 18px 0 8px; }
    .subtitle { color: #666; margin-bottom: 28px; font-size: 14px; }
    .day { border: 1px solid #e5e5e5; border-radius: 10px; margin-bottom: 16px; overflow: hidden; break-inside: avoid; }
    .day-header { background: #f8f8f8; padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e5e5; }
    .day-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; display: block; }
    .day-header h3 { font-size: 14px; margin: 2px 0 0; }
    .day-meta { text-align: right; font-size: 11px; color: #666; line-height: 1.6; }
    .activities { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
    .activity { display: flex; gap: 10px; }
    .time-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
    .activity p { color: #555; margin-top: 2px; line-height: 1.4; }
    .tip { font-size: 11px; color: #888; font-style: italic; border-top: 1px solid #f0f0f0; padding-top: 8px; margin-top: 4px; }
    .badge { font-size: 10px; color: #c47900; font-weight: 600; margin-left: 6px; }
    .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; margin-bottom: 10px; break-inside: avoid; }
    .card p { color: #555; margin-top: 4px; line-height: 1.4; }
    .muted { color: #888; font-weight: 400; font-size: 12px; }
    .highlight { color: #0066cc; font-size: 12px; margin-top: 4px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #aaa; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${destination}</h1>
  <p class="subtitle">${dateRange} · ${content.length} day${content.length !== 1 ? 's' : ''}</p>
  <h2>Day-by-Day Itinerary</h2>
  ${dayRows}
  ${accomHtml}
  ${transportHtml}
  ${weatherHtml}
  <div class="footer">Generated by Waymark · AI-generated content may contain inaccuracies. Always verify details before booking.</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  if (loadingItinerary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!itinerary) return <Navigate to="/plan" replace />;

  const hasItinerary = itinerary.content.length > 0;
  const hasMetadata = !!(itinerary.metadata?.accommodation || itinerary.metadata?.transport || itinerary.metadata?.weather);
  const isEmpty = messages.length === 0 && !hasItinerary;
  const builderPhase = itinerary.metadata?.builder_phase;
  const isBuilderMode = !builderPhase || builderPhase === 'skeleton';

  return (
    <div className="min-h-screen pb-20 md:pb-0 flex flex-col">
      <Header />

      {/* Sticky subheader */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-14 md:top-16 z-40">
        <div className="container flex items-center gap-3 h-12">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/plan')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{itinerary.destination}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(itinerary.start_date), 'MMM d')} –{' '}
              {format(new Date(itinerary.end_date), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isGenerating ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating…
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => id && resetItinerary.mutate(id)}
                  disabled={resetItinerary.isPending}
                >
                  Cancel
                </Button>
              </>
            ) : !isBuilderMode && hasItinerary ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleDownload}
              >
                <Download className="w-3 h-3" />
                Download PDF
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex-1 container py-4 md:py-6 flex flex-col md:flex-row gap-6 max-w-6xl">

        {/* Right: chat — first on mobile, second on desktop */}
        <div className="order-1 md:order-2 md:w-1/2 flex flex-col gap-3">
          {/* Messages */}
          <div className="flex-1 space-y-3 md:overflow-y-auto md:max-h-[calc(100vh-18rem)]">
            {isEmpty && !loadingMessages && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  {isBuilderMode ? 'Build mode active' : 'Hi! I\'m your travel planner.'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isBuilderMode
                    ? 'Lock the activities you want, pick alternatives for any slot, then hit "Complete Itinerary" to let AI fill the gaps. Or just chat here to generate the whole plan at once.'
                    : `Tell me what kind of trip you're after — adventure, relaxation, food, culture — and I'll build a day-by-day itinerary for ${itinerary.destination}, along with the best areas to stay, transport tips, and what to expect weather-wise.`}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-muted/40 text-foreground mr-8'
                )}
              >
                {msg.content}
              </div>
            ))}

            {isGenerating && (
              <div className="bg-muted/40 rounded-xl px-4 py-3 mr-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <Textarea
              className="resize-none min-h-[52px] max-h-32"
              placeholder="Ask me to plan your trip, adjust days, add activities…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              rows={2}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="shrink-0 h-[52px] w-[52px]"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Left: builder or tabs — second on mobile, first on desktop */}
        <div className="order-2 md:order-1 md:w-1/2 md:overflow-y-auto md:max-h-[calc(100vh-12rem)] md:pr-2">
          {isBuilderMode ? (
            <ItineraryBuilder itinerary={itinerary} />
          ) : !hasItinerary && !hasMetadata ? (
            <div className="hidden md:flex items-center justify-center h-full text-muted-foreground text-sm">
              Your itinerary will appear here.
            </div>
          ) : (
            <Tabs defaultValue="itinerary">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="itinerary" className="flex-1">Itinerary</TabsTrigger>
                <TabsTrigger value="stay" className="flex-1">Stay</TabsTrigger>
                <TabsTrigger value="transport" className="flex-1">Transport</TabsTrigger>
                <TabsTrigger value="weather" className="flex-1">Weather</TabsTrigger>
              </TabsList>

              <TabsContent value="itinerary" className="space-y-3 mt-0">
                {hasItinerary ? (
                  <>
                    {itinerary.content.map((day) => <DayCard key={day.day} day={day} />)}
                    <AiDisclaimer variant="itinerary" className="mt-2" />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    {isGenerating ? 'Building your itinerary…' : 'Chat with the assistant to generate your itinerary.'}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="stay" className="mt-0">
                <StayTab metadata={itinerary.metadata ?? {}} />
              </TabsContent>

              <TabsContent value="transport" className="mt-0">
                <TransportTab metadata={itinerary.metadata ?? {}} />
              </TabsContent>

              <TabsContent value="weather" className="mt-0">
                <WeatherTab
                  metadata={itinerary.metadata ?? {}}
                  destination={itinerary.destination}
                  startDate={itinerary.start_date}
                  endDate={itinerary.end_date}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Mobile: show generating state when in non-builder mode */}
          {!isBuilderMode && !hasItinerary && !hasMetadata && (
            <p className="md:hidden text-sm text-muted-foreground text-center py-8">
              {isGenerating ? 'Building your itinerary…' : ''}
            </p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
