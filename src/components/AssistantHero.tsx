import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard, Mic, Camera, ArrowRight, Square } from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeech';
import { cn } from '@/lib/utils';

type ComposerMode = 'type' | 'speak' | 'show';

const PROMPT_CHIPS = [
  'Plan a 5-day trip to Kyoto in cherry blossom season',
  'What should I pack for a rainy week in Reykjavík?',
  'Find quiet cafés near my hotel in Lisbon',
];

interface Arc {
  x0: number; y0: number; x1: number; y1: number;
  bow: number; phase: number; speed: number;
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arcPoint(arc: Arc, t: number): [number, number] {
  const mx = (arc.x0 + arc.x1) / 2;
  const my = (arc.y0 + arc.y1) / 2 + arc.bow;
  const x = (1 - t) ** 2 * arc.x0 + 2 * (1 - t) * t * mx + t ** 2 * arc.x1;
  const y = (1 - t) ** 2 * arc.y0 + 2 * (1 - t) * t * my + t ** 2 * arc.y1;
  return [x, y];
}

/** Ambient decoration only — ARIA-hidden, so it carries no product meaning to lose on failure. */
function RouteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !container || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let arcs: Arc[] = [];
    let frame: number;

    function seedArcs(w: number, h: number) {
      const rand = mulberry32(20240521);
      const count = w < 640 ? 3 : 5;
      arcs = Array.from({ length: count }, () => {
        const x0 = rand() * w * 0.9;
        const y0 = h * (0.15 + rand() * 0.6);
        const x1 = x0 + (rand() * 0.5 + 0.2) * w * 0.6;
        const y1 = y0 - (rand() * 0.3 + 0.05) * h * 0.5 * (rand() > 0.5 ? 1 : -1);
        return { x0, y0, x1, y1, bow: (rand() - 0.5) * h * 0.35, phase: rand() * Math.PI * 2, speed: 0.00025 + rand() * 0.0003 };
      });
    }

    function resize() {
      const rect = container!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      canvas!.style.height = `${rect.height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedArcs(rect.width, rect.height);
    }

    function draw(time: number) {
      const rect = container!.getBoundingClientRect();
      ctx!.clearRect(0, 0, rect.width, rect.height);

      for (const arc of arcs) {
        ctx!.beginPath();
        for (let s = 0; s <= 40; s++) {
          const [x, y] = arcPoint(arc, s / 40);
          if (s === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = 'hsla(36, 78%, 58%, 0.16)';
        ctx!.lineWidth = 1;
        ctx!.stroke();

        for (const [x, y] of [[arc.x0, arc.y0], [arc.x1, arc.y1]] as const) {
          ctx!.beginPath();
          ctx!.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx!.fillStyle = 'hsla(36, 78%, 58%, 0.4)';
          ctx!.fill();
        }

        if (!reduceMotion) {
          const t = (Math.sin(time * arc.speed + arc.phase) + 1) / 2;
          const [x, y] = arcPoint(arc, t);
          ctx!.beginPath();
          ctx!.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx!.fillStyle = 'hsl(36, 85%, 65%)';
          ctx!.shadowColor = 'hsl(36, 85%, 65%)';
          ctx!.shadowBlur = 6;
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    frame = requestAnimationFrame(draw);
    if (reduceMotion) draw(0);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="assistant-hero-canvas" aria-hidden="true" />;
}

interface AssistantHeroProps {
  /** Show the "what this does" pitch content (modality strip + sample output).
   *  Only makes sense for people who haven't seen the product before —
   *  a returning user with real trips doesn't need re-onboarding every visit. */
  showPitch: boolean;
}

export function AssistantHero({ showPitch }: AssistantHeroProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ComposerMode>('type');
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDictationResult = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  };
  const { startListening, stopListening, isListening, isSupported: speechSupported } = useSpeechToText(handleDictationResult);

  const photoRef = useRef(photo);
  photoRef.current = photo;

  useEffect(() => {
    return () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
    };
  }, []);

  const handleModeClick = (next: ComposerMode) => {
    if (isListening && next !== 'speak') stopListening();

    if (next === 'speak') {
      if (!speechSupported) return;
      if (isListening) {
        stopListening();
        setMode('type');
      } else {
        setMode('speak');
        startListening();
      }
      return;
    }

    if (next === 'show') {
      fileInputRef.current?.click();
      return;
    }

    setMode('type');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
    setMode('show');
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (isListening) stopListening();
    navigate('/plan/new', { state: { prompt: trimmed } });
  };

  const hints: Record<ComposerMode, string> = {
    type: 'TYPE ACTIVE — TAP TO SPEAK OR SHOW A PHOTO INSTEAD',
    speak: isListening ? 'LISTENING… TAP THE MIC TO STOP' : 'SPEAK ACTIVE — TAP TO TYPE OR SHOW A PHOTO INSTEAD',
    show: 'SHOW ACTIVE — TAP TO TYPE OR SPEAK INSTEAD',
  };

  return (
    <section className="assistant-hero">
      <RouteCanvas />
      <div className="assistant-hero-fade" aria-hidden="true" />

      <div className="assistant-hero-inner">
        <p className="assistant-eyebrow">Multi-modal travel assistant</p>
        <h1 className="assistant-headline">
          Where to
          <br />
          <em>next?</em>
        </h1>
        <p className="assistant-subhead">
          Type it, say it, or show it a photo — Waymark plans the trip either way.
        </p>

        <form
          className="assistant-composer"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <div className="assistant-mode-group" role="group" aria-label="Input mode">
            <button
              type="button"
              className={cn('assistant-mode-btn', mode === 'type' && 'is-active')}
              onClick={() => handleModeClick('type')}
              aria-label="Type"
              aria-pressed={mode === 'type'}
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={cn(
                'assistant-mode-btn',
                mode === 'speak' && !isListening && 'is-active',
                isListening && 'is-listening'
              )}
              onClick={() => handleModeClick('speak')}
              aria-label={isListening ? 'Stop listening' : 'Speak'}
              aria-pressed={mode === 'speak'}
              disabled={!speechSupported}
              title={speechSupported ? undefined : 'Voice input is not supported in this browser'}
            >
              {isListening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="button"
              className={cn('assistant-mode-btn', mode === 'show' && 'is-active')}
              onClick={() => handleModeClick('show')}
              aria-label="Show a photo"
              aria-pressed={mode === 'show'}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <input
            className="assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Plan 4 days in Lisbon, under $1,200…"
            aria-label="Ask Waymark"
          />

          <button type="submit" className="assistant-send" disabled={!input.trim()} aria-label="Send">
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="assistant-hint">↳ {hints[mode]}</p>

        {photo && (
          <div className="assistant-photo-preview">
            <img src={photo.previewUrl} alt="" />
            <span>{photo.file.name} attached — photo understanding is coming soon</span>
          </div>
        )}

        <div className="assistant-chips">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="assistant-chip"
              onClick={() => { setInput(chip); setMode('type'); }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {showPitch && (
        <>
          <div className="assistant-modalities" aria-label="Input modes">
            <article className="assistant-stub">
              <p className="assistant-stub-tag">01 · TYPE</p>
              <h3>Full sentences, real questions</h3>
              <p>No forms, no dropdowns — ask the way you'd ask a well-travelled friend.</p>
            </article>
            <article className="assistant-stub">
              <p className="assistant-stub-tag">02 · SPEAK</p>
              <h3>Hands-free, mid-packing</h3>
              <p>Talk through the trip while you're doing something else. Waymark listens and plans.</p>
            </article>
            <article className="assistant-stub">
              <p className="assistant-stub-tag">03 · SHOW</p>
              <h3>A photo is an input</h3>
              <p>A landmark, a menu, a trail sign — attach it and Waymark folds it into the plan.</p>
            </article>
          </div>

          <div className="assistant-example">
            <p className="assistant-example-label">Example — what a plan looks like</p>
            <div className="assistant-example-card">
              <div className="assistant-example-head">
                <span className="assistant-example-status">SAMPLE OUTPUT</span>
              </div>
              <h3 className="assistant-example-day">DAY 2 — KYOTO</h3>
              <ul className="assistant-example-plan">
                <li><span className="time">07:40</span><span>Fushimi Inari, before the crowds arrive</span></li>
                <li><span className="time">11:00</span><span>Coffee, then a 14-minute walk to Gion</span></li>
                <li><span className="time">18:30</span><span>Kaiseki dinner, booked within your budget note</span></li>
              </ul>
              <div className="assistant-example-media">
                <span className="assistant-route-chip">Fushimi Inari → Gion</span>
                <span className="assistant-photo-chip">FROM A PHOTO</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
