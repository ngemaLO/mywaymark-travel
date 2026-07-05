import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Planet {
  x: number;       // 0–1 (fraction of canvas width)
  y: number;       // 0–1 (fraction of canvas height)
  radius: number;
  color: string;
  ringColor: string | null;
  ringTilt: number;
  glowColor: string;
  glowRadius: number;
}

const PLANETS: Planet[] = [
  // Saturn — upper-right quadrant
  {
    x: 0.82, y: 0.14,
    radius: 7,
    color: '#c8a96e',
    ringColor: 'rgba(210,180,100,0.35)',
    ringTilt: 0.38,
    glowColor: 'rgba(200,169,110,0.12)',
    glowRadius: 38,
  },
  // Ice blue distant planet — lower-left area
  {
    x: 0.09, y: 0.72,
    radius: 4,
    color: '#7ab3d4',
    ringColor: null,
    ringTilt: 0,
    glowColor: 'rgba(100,160,210,0.10)',
    glowRadius: 22,
  },
  // Tiny red/orange dot — upper-left
  {
    x: 0.22, y: 0.08,
    radius: 2.5,
    color: '#c8754a',
    ringColor: null,
    ringTilt: 0,
    glowColor: 'rgba(200,100,60,0.10)',
    glowRadius: 16,
  },
];

function buildStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() < 0.85 ? Math.random() * 0.8 + 0.2 : Math.random() * 1.4 + 0.8,
      opacity: Math.random() * 0.55 + 0.25,
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function drawSun(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sun sits off-canvas bottom-right — only the corona bleeds in
  const sx = w * 1.04;
  const sy = h * 0.88;

  const outerGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.55);
  outerGlow.addColorStop(0, 'rgba(255,210,100,0.07)');
  outerGlow.addColorStop(0.4, 'rgba(255,160,60,0.04)');
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, w, h);

  const innerGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.22);
  innerGlow.addColorStop(0, 'rgba(255,230,130,0.18)');
  innerGlow.addColorStop(0.5, 'rgba(255,190,70,0.08)');
  innerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = innerGlow;
  ctx.fillRect(0, 0, w, h);
}

function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet, w: number, h: number) {
  const px = p.x * w;
  const py = p.y * h;

  // Glow
  const glow = ctx.createRadialGradient(px, py, 0, px, py, p.glowRadius);
  glow.addColorStop(0, p.glowColor);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(px, py, p.glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Planet body
  const bodyGrad = ctx.createRadialGradient(px - p.radius * 0.3, py - p.radius * 0.3, 0, px, py, p.radius);
  bodyGrad.addColorStop(0, lighten(p.color, 0.3));
  bodyGrad.addColorStop(1, darken(p.color, 0.35));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(px, py, p.radius, 0, Math.PI * 2);
  ctx.fill();

  // Ring (Saturn only)
  if (p.ringColor) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, p.ringTilt);
    ctx.strokeStyle = p.ringColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 2.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Naive colour helpers — work on hex strings like '#aabbcc'
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + 255 * amount)},${Math.min(255, g + 255 * amount)},${Math.min(255, b + 255 * amount)})`;
}
function darken(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, r - 255 * amount)},${Math.max(0, g - 255 * amount)},${Math.max(0, b - 255 * amount)})`;
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = buildStars(320, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars
      t += 0.016;
      for (const star of starsRef.current) {
        const twinkle = Math.sin(t * star.twinkleSpeed * 60 + star.twinkleOffset);
        const alpha = star.opacity + twinkle * 0.18;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        // Slight blue-white tint
        ctx.fillStyle = `rgba(200,215,255,${Math.max(0.05, Math.min(1, alpha))})`;
        ctx.fill();
      }

      // Sun corona (behind planets)
      drawSun(ctx, canvas.width, canvas.height);

      // Planets
      for (const planet of PLANETS) {
        drawPlanet(ctx, planet, canvas.width, canvas.height);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
