import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Globe, Star, Trophy, Zap, Mountain, Rocket } from 'lucide-react';

interface MilestoneModalProps {
  milestone: number | null;
  triggerFlag?: string;
  onClose: () => void;
}

const MILESTONES: Record<number, {
  icon: React.ElementType;
  title: string;
  message: string;
  color: string;
  bg: string;
  ring: string;
  confettiColors: string[];
}> = {
  1: {
    icon: Globe,
    title: 'First stamp!',
    message: 'Your world map just got its first mark. Every great journey starts with a single step — this is yours.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/15',
    ring: 'shadow-emerald-400/40',
    confettiColors: ['#34d399', '#6ee7b7', '#a7f3d0', '#ffffff'],
  },
  5: {
    icon: Star,
    title: '5 countries explored',
    message: "You're building something beautiful. Five different cultures, five skies, five sets of memories.",
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/15',
    ring: 'shadow-yellow-400/40',
    confettiColors: ['#facc15', '#fde68a', '#fef3c7', '#ffffff'],
  },
  10: {
    icon: Trophy,
    title: '10 countries reached',
    message: "Double digits. You're a proper world explorer now — the map is starting to fill in.",
    color: 'text-amber-400',
    bg: 'bg-amber-400/15',
    ring: 'shadow-amber-400/40',
    confettiColors: ['#fb923c', '#fcd34d', '#fde68a', '#ffffff'],
  },
  25: {
    icon: Zap,
    title: '25 countries!',
    message: "A quarter of the world's nations. Your passport tells quite a story.",
    color: 'text-blue-400',
    bg: 'bg-blue-400/15',
    ring: 'shadow-blue-400/40',
    confettiColors: ['#60a5fa', '#93c5fd', '#bfdbfe', '#ffffff'],
  },
  50: {
    icon: Mountain,
    title: 'Halfway there',
    message: "Fifty countries. You've seen more of this world than most people ever will. Remarkable.",
    color: 'text-violet-400',
    bg: 'bg-violet-400/15',
    ring: 'shadow-violet-400/40',
    confettiColors: ['#a78bfa', '#c4b5fd', '#ddd6fe', '#ffffff'],
  },
  100: {
    icon: Rocket,
    title: 'Century reached',
    message: 'One hundred countries. You are truly extraordinary. The world is your home.',
    color: 'text-rose-400',
    bg: 'bg-rose-400/15',
    ring: 'shadow-rose-400/40',
    confettiColors: ['#fb7185', '#fda4af', '#fecdd3', '#ffd700'],
  },
};

export function MilestoneModal({ milestone, triggerFlag, onClose }: MilestoneModalProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!milestone || firedRef.current) return;
    firedRef.current = true;

    const data = MILESTONES[milestone];
    if (!data) return;

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.6 },
        colors: data.confettiColors,
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });
    };

    // Staggered multi-burst for a rich effect
    setTimeout(() => {
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }, 150);
  }, [milestone]);

  // Reset fired flag when milestone clears so next milestone triggers again
  useEffect(() => {
    if (!milestone) firedRef.current = false;
  }, [milestone]);

  if (!milestone) return null;
  const data = MILESTONES[milestone];
  if (!data) return null;

  const Icon = data.icon;

  return (
    <Dialog open={!!milestone} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm text-center border-border/30 bg-card/95 backdrop-blur-xl overflow-hidden">
        {/* Background glow blob */}
        <div
          className={`absolute inset-0 opacity-10 blur-3xl pointer-events-none`}
          style={{ background: `radial-gradient(circle at 50% 30%, currentColor 0%, transparent 70%)` }}
          aria-hidden
        />

        <div className="relative flex flex-col items-center space-y-6 py-6">
          {/* Animated flag/icon with pulsing rings */}
          <div className="relative flex items-center justify-center">
            <span
              className={`absolute w-32 h-32 rounded-full ${data.bg} animate-ping opacity-30`}
              style={{ animationDuration: '2s' }}
              aria-hidden
            />
            <span
              className={`absolute w-24 h-24 rounded-full ${data.bg} animate-ping opacity-40`}
              style={{ animationDuration: '2s', animationDelay: '0.3s' }}
              aria-hidden
            />
            <div className={`relative w-24 h-24 rounded-full ${data.bg} flex items-center justify-center shadow-2xl`}>
              {triggerFlag ? (
                <span className="text-5xl leading-none select-none" role="img">{triggerFlag}</span>
              ) : (
                <Icon className={`w-10 h-10 ${data.color} drop-shadow-lg`} />
              )}
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${data.color}`}>
              {milestone} {milestone === 1 ? 'country' : 'countries'}
            </p>
            <h2 className="text-3xl font-display font-bold text-foreground leading-tight">
              {data.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {data.message}
            </p>
          </div>

          {/* CTA */}
          <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
            <Button
              onClick={onClose}
              className={`w-full h-12 text-base font-semibold`}
            >
              Keep exploring ✈️
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
