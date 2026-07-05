import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Lock, LockOpen, RefreshCw, Loader2, Sunrise, Sun, Moon, Sparkles, Wand2 } from 'lucide-react';
import type { Itinerary, ItineraryDay, ItineraryActivity, SlotOption } from '@/hooks/useItineraries';
import { useGenerateSkeleton, useGetSlotOptions, useCompleteItinerary, useAIUsage, AI_FREE_LIMIT } from '@/hooks/useItineraries';
import { AiDisclaimer } from '@/components/AiDisclaimer';

type TimeSlot = 'morning' | 'afternoon' | 'evening';
type LockKey = `${number}-${TimeSlot}`;

const TIME_ICONS: Record<TimeSlot, React.ElementType> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

const TIME_LABELS: Record<TimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const TIME_ORDER: TimeSlot[] = ['morning', 'afternoon', 'evening'];

function lockKey(day: number, time: TimeSlot): LockKey {
  return `${day}-${time}`;
}

function mergeActivity(
  days: ItineraryDay[],
  targetDay: number,
  time: TimeSlot,
  activity: ItineraryActivity
): ItineraryDay[] {
  return days.map((d) => {
    if (d.day !== targetDay) return d;
    const others = d.activities.filter((a) => a.time !== time);
    const sorted = [...others, activity].sort(
      (a, b) => TIME_ORDER.indexOf(a.time) - TIME_ORDER.indexOf(b.time)
    );
    return { ...d, activities: sorted };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SlotCardProps {
  day: number;
  time: TimeSlot;
  activity?: ItineraryActivity;
  isLocked: boolean;
  isLoadingOptions: boolean;
  onLockToggle: () => void;
  onPick: () => void;
}

function SlotCard({ day, time, activity, isLocked, isLoadingOptions, onLockToggle, onPick }: SlotCardProps) {
  const Icon = TIME_ICONS[time];

  if (!activity) {
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="flex items-center gap-1.5 w-24 shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground/50">{TIME_LABELS[time]}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground border border-dashed border-border/50 hover:border-primary/40 hover:text-primary"
          onClick={onPick}
          disabled={isLoadingOptions}
        >
          {isLoadingOptions ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Pick activity
        </Button>
        <span className="text-xs text-muted-foreground/40 mt-1.5">or AI will fill</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-start gap-3 py-2 rounded-lg px-2 -mx-2 transition-colors',
      isLocked ? 'bg-primary/5' : ''
    )}>
      <div className="flex items-center gap-1.5 w-24 shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{TIME_LABELS[time]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{activity.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{activity.description}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onPick}
          disabled={isLoadingOptions}
          title="Swap activity"
        >
          {isLoadingOptions ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onLockToggle}
          title={isLocked ? 'Unlock' : 'Lock'}
        >
          {isLocked ? (
            <Lock className="w-3 h-3 text-primary" />
          ) : (
            <LockOpen className="w-3 h-3 text-muted-foreground/50" />
          )}
        </Button>
      </div>
    </div>
  );
}

interface SwapDialogProps {
  open: boolean;
  options: SlotOption[];
  time: TimeSlot;
  isLoading: boolean;
  onSelect: (option: SlotOption) => void;
  onClose: () => void;
}

function SwapDialog({ open, options, time, isLoading, onSelect, onClose }: SwapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {(() => { const Icon = TIME_ICONS[time]; return <Icon className="w-4 h-4" />; })()}
            Choose a {TIME_LABELS[time]} activity
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding options…
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => onSelect(opt)}
                className="w-full text-left rounded-xl border border-border/50 bg-card/60 hover:border-primary/50 hover:bg-primary/5 p-4 transition-colors space-y-1"
              >
                <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ItineraryBuilderProps {
  itinerary: Itinerary;
}

export function ItineraryBuilder({ itinerary }: ItineraryBuilderProps) {
  const [localContent, setLocalContent] = useState<ItineraryDay[]>(itinerary.content);
  const [lockedSlots, setLockedSlots] = useState<Set<LockKey>>(new Set());
  const [swapTarget, setSwapTarget] = useState<{ day: number; time: TimeSlot } | null>(null);
  const [swapOptions, setSwapOptions] = useState<SlotOption[]>([]);

  const generateSkeleton = useGenerateSkeleton();
  const getSlotOptions = useGetSlotOptions();
  const completeItinerary = useCompleteItinerary();
  const { canGenerate, used, isPro } = useAIUsage();

  const isGenerating = itinerary.status === 'generating';

  // Auto-trigger skeleton on first load if no content yet and user has quota
  useEffect(() => {
    if (
      itinerary.content.length === 0 &&
      itinerary.status === 'ready' &&
      !generateSkeleton.isPending &&
      canGenerate
    ) {
      generateSkeleton.mutate(itinerary.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary.id, canGenerate]);

  // Sync localContent when skeleton arrives from DB
  useEffect(() => {
    if (itinerary.content.length > 0) {
      setLocalContent(itinerary.content);
    }
  }, [itinerary.content]);

  const toggleLock = (day: number, time: TimeSlot) => {
    const key = lockKey(day, time);
    setLockedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openSwap = async (day: number, time: TimeSlot) => {
    setSwapTarget({ day, time });
    setSwapOptions([]);
    const result = await getSlotOptions.mutateAsync({
      itineraryId: itinerary.id,
      slot: { day, time },
    });
    setSwapOptions(result.options);
  };

  const handleSelectOption = (option: SlotOption) => {
    if (!swapTarget) return;
    const activity: ItineraryActivity = {
      time: swapTarget.time,
      title: option.title,
      description: option.description,
      website: option.website,
      booking_url: option.booking_url,
    };
    setLocalContent((prev) => mergeActivity(prev, swapTarget.day, swapTarget.time, activity));
    // Auto-lock the slot after user picks
    setLockedSlots((prev) => new Set([...prev, lockKey(swapTarget.day, swapTarget.time)]));
    setSwapTarget(null);
  };

  const handleComplete = () => {
    completeItinerary.mutate({ itineraryId: itinerary.id, currentContent: localContent });
  };

  if (isGenerating || generateSkeleton.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Building your day outline…</p>
      </div>
    );
  }

  if (localContent.length === 0 && !canGenerate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Monthly limit reached</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            You've used your {AI_FREE_LIMIT} free AI plan generations this month. Upgrade to Pro for unlimited planning.
          </p>
        </div>
      </div>
    );
  }

  if (localContent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <p className="text-sm">Preparing your skeleton…</p>
      </div>
    );
  }

  const isCompleting = completeItinerary.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Build your trip</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lock activities you want to keep. AI fills the rest.
            {!isPro && (
              <span className="ml-1 text-muted-foreground/60">· {AI_FREE_LIMIT - used} free {AI_FREE_LIMIT - used === 1 ? 'generation' : 'generations'} left</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleComplete}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Building…
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              Complete Itinerary
            </>
          )}
        </Button>
      </div>

      {/* Day cards */}
      {localContent.map((day) => (
        <div
          key={day.day}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
        >
          {/* Day header */}
          <div className="bg-muted/30 px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Day {day.day}
              </span>
              <p className="text-sm font-semibold text-foreground leading-snug">{day.title}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {format(new Date(day.date), 'EEE, MMM d')}
              </p>
              <p className="text-xs text-muted-foreground/70">{day.location}</p>
            </div>
          </div>

          {/* Time slots */}
          <div className="px-4 py-2 divide-y divide-border/30">
            {TIME_ORDER.map((time) => {
              const activity = day.activities.find((a) => a.time === time);
              const key = lockKey(day.day, time);
              const isSwappingThis =
                getSlotOptions.isPending && swapTarget?.day === day.day && swapTarget?.time === time;

              return (
                <SlotCard
                  key={time}
                  day={day.day}
                  time={time}
                  activity={activity}
                  isLocked={lockedSlots.has(key)}
                  isLoadingOptions={isSwappingThis}
                  onLockToggle={() => toggleLock(day.day, time)}
                  onPick={() => openSwap(day.day, time)}
                />
              );
            })}
          </div>
        </div>
      ))}

      <AiDisclaimer variant="itinerary" className="mt-2" />

      {/* Swap dialog */}
      <SwapDialog
        open={swapTarget !== null}
        options={swapOptions}
        time={swapTarget?.time ?? 'morning'}
        isLoading={getSlotOptions.isPending && swapOptions.length === 0}
        onSelect={handleSelectOption}
        onClose={() => setSwapTarget(null)}
      />
    </div>
  );
}
