import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { geoOrthographic, geoPath, geoCentroid, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { RotateCcw } from 'lucide-react';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const GLOBE_SIZE = 500;
const GLOBE_CENTER: [number, number] = [GLOBE_SIZE / 2, GLOBE_SIZE / 2];
const GLOBE_SCALE = 240;

// Colors for 3-way comparison
const COLOR_BOTH    = '#10B981'; // emerald — visited together
const COLOR_MINE    = '#F97316'; // amber  — only you
const COLOR_THEIRS  = '#818CF8'; // indigo — only them

const NUMERIC_TO_ISO2: Record<string, string> = {
  '004':'AF','008':'AL','012':'DZ','020':'AD','024':'AO','028':'AG','032':'AR','036':'AU',
  '040':'AT','031':'AZ','044':'BS','048':'BH','050':'BD','052':'BB','056':'BE','060':'BM',
  '064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN',
  '100':'BG','104':'MM','108':'BI','112':'BY','116':'KH','120':'CM','124':'CA','132':'CV',
  '140':'CF','144':'LK','148':'TD','152':'CL','156':'CN','158':'TW','170':'CO','174':'KM',
  '178':'CG','180':'CD','188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ',
  '208':'DK','212':'DM','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER',
  '233':'EE','242':'FJ','246':'FI','250':'FR','262':'DJ','266':'GA','268':'GE','270':'GM',
  '275':'PS','276':'DE','288':'GH','296':'KI','300':'GR','308':'GD','316':'GU','320':'GT',
  '324':'GN','328':'GY','332':'HT','340':'HN','344':'HK','348':'HU','352':'IS','356':'IN',
  '360':'ID','364':'IR','368':'IQ','372':'IE','376':'IL','380':'IT','384':'CI','388':'JM',
  '392':'JP','398':'KZ','400':'JO','404':'KE','408':'KP','410':'KR','414':'KW','417':'KG',
  '418':'LA','422':'LB','426':'LS','428':'LV','430':'LR','434':'LY','438':'LI','440':'LT',
  '442':'LU','450':'MG','454':'MW','458':'MY','462':'MV','466':'ML','470':'MT','478':'MR',
  '480':'MU','484':'MX','492':'MC','496':'MN','498':'MD','499':'ME','504':'MA','508':'MZ',
  '512':'OM','516':'NA','520':'NR','524':'NP','528':'NL','540':'NC','548':'VU','554':'NZ',
  '558':'NI','562':'NE','566':'NG','578':'NO','583':'FM','584':'MH','585':'PW',
  '586':'PK','591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT',
  '624':'GW','626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW','659':'KN',
  '662':'LC','670':'VC','674':'SM','678':'ST','682':'SA','686':'SN','688':'RS','690':'SC',
  '694':'SL','702':'SG','703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA','716':'ZW',
  '724':'ES','728':'SS','729':'SD','732':'EH','740':'SR','748':'SZ','752':'SE','756':'CH',
  '760':'SY','762':'TJ','764':'TH','768':'TG','776':'TO','780':'TT','784':'AE','788':'TN',
  '792':'TR','795':'TM','798':'TV','800':'UG','804':'UA','807':'MK','818':'EG','826':'GB',
  '834':'TZ','840':'US','854':'BF','858':'UY','860':'UZ','862':'VE','882':'WS',
  '887':'YE','894':'ZM','-99':'XK',
};

interface CountryFeature {
  type: 'Feature';
  id: string;
  properties: { name: string };
  geometry: GeoJSON.Geometry;
}

interface Props {
  myIsos: string[];
  theirIsos: string[];
  myName: string;
  theirName: string;
}

export function CompareGlobe({ myIsos, theirIsos, myName, theirName }: Props) {
  const [geoData, setGeoData] = useState<CountryFeature[] | null>(null);
  const [rotation, setRotation] = useState<[number, number]>([0, -20]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const dragStart = useRef<{ x: number; y: number; rot: [number, number] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animFrameRef = useRef<number>();
  const autoRotateStartTime = useRef<number>(0);

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then((topo: Topology<{ countries: GeometryCollection }>) => {
        const c = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
        setGeoData(c.features as CountryFeature[]);
      });
  }, []);

  useEffect(() => {
    if (!autoRotate || isDragging) return;
    let lastTime = performance.now();
    if (!autoRotateStartTime.current) autoRotateStartTime.current = lastTime;
    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      const elapsed = (time - autoRotateStartTime.current) / 1000;
      const latTilt = Math.sin(elapsed * (2 * Math.PI / 40)) * 30;
      setRotation(prev => [(prev[0] + delta * 0.008) % 360, latTilt]);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [autoRotate, isDragging]);

  const projection = useMemo(
    () => geoOrthographic().scale(GLOBE_SCALE).translate(GLOBE_CENTER).rotate([-rotation[0], -rotation[1]]).clipAngle(90),
    [rotation]
  );
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule().step([20, 20])(), []);
  const graticulePath = useMemo(() => pathGenerator(graticule), [pathGenerator, graticule]);
  const outlinePath = useMemo(() => pathGenerator({ type: 'Sphere' } as Parameters<typeof pathGenerator>[0]), [pathGenerator]);

  const polygons = useMemo(() => {
    if (!geoData) return [];
    const result: { feature: CountryFeature; path: string | null; iso2: string | null; name: string }[] = [];
    for (const f of geoData) {
      const numId = f.id?.toString().padStart(3, '0');
      const iso2 = NUMERIC_TO_ISO2[numId] ?? null;
      const geom = f.geometry;
      const name = f.properties?.name ?? '';
      const shapes = geom.type === 'MultiPolygon'
        ? geom.coordinates.map((c: GeoJSON.Position[][]) => ({ type: 'Polygon' as const, coordinates: c }))
        : geom.type === 'Polygon'
          ? [geom as GeoJSON.Polygon]
          : [];
      for (const shape of shapes) {
        const path = pathGenerator(shape as Parameters<typeof pathGenerator>[0]);
        result.push({ feature: f, path, iso2, name });
      }
    }
    return result;
  }, [geoData, pathGenerator]);

  const getFill = useCallback((iso2: string | null) => {
    if (!iso2) return 'hsl(var(--map-land))';
    const inMine = myIsos.includes(iso2);
    const inTheirs = theirIsos.includes(iso2);
    if (inMine && inTheirs) return COLOR_BOTH;
    if (inMine) return COLOR_MINE;
    if (inTheirs) return COLOR_THEIRS;
    return 'hsl(var(--map-land))';
  }, [myIsos, theirIsos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true); setAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY, rot: [...rotation] as [number, number] };
    setTooltip(null);
  }, [rotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation([dragStart.current.rot[0] + dx * 0.3, Math.max(-80, Math.min(80, dragStart.current.rot[1] - dy * 0.3))]);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); dragStart.current = null; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setIsDragging(true); setAutoRotate(false);
    dragStart.current = { x: t.clientX, y: t.clientY, rot: [...rotation] as [number, number] };
    setTooltip(null);
  }, [rotation]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStart.current || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.x;
    const dy = t.clientY - dragStart.current.y;
    setRotation([dragStart.current.rot[0] + dx * 0.3, Math.max(-80, Math.min(80, dragStart.current.rot[1] - dy * 0.3))]);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => { setIsDragging(false); dragStart.current = null; }, []);

  const handleHover = useCallback((e: React.MouseEvent, iso2: string | null, name: string) => {
    if (isDragging || !iso2) return;
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    const inMine = myIsos.includes(iso2);
    const inTheirs = theirIsos.includes(iso2);
    let label = name;
    if (inMine && inTheirs) label = `${name} · Both`;
    else if (inMine) label = `${name} · ${myName} only`;
    else if (inTheirs) label = `${name} · ${theirName} only`;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: label });
  }, [isDragging, myIsos, theirIsos, myName, theirName]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative select-none"
        style={{ width: '100%', maxWidth: GLOBE_SIZE, aspectRatio: '1' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setTooltip(null); }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${GLOBE_SIZE} ${GLOBE_SIZE}`}
          className="w-full h-full"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <defs>
            <radialGradient id="cmp-ocean" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="hsl(var(--map-bg))" />
              <stop offset="100%" stopColor="hsl(var(--map-bg) / 0.85)" />
            </radialGradient>
            <radialGradient id="cmp-shadow" cx="35%" cy="30%" r="60%">
              <stop offset="0%" stopColor="hsl(var(--background))" stopOpacity="0.02" />
              <stop offset="70%" stopColor="hsl(var(--foreground))" stopOpacity="0.06" />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="cmp-highlight" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>

          {outlinePath && <path d={outlinePath} fill="url(#cmp-ocean)" stroke="hsl(var(--map-bg) / 0.6)" strokeWidth="0.5" />}
          {graticulePath && <path d={graticulePath} fill="none" stroke="hsl(var(--map-bg) / 0.4)" strokeWidth="0.3" />}

          {polygons.map((p, i) => p.path && (
            <path
              key={i}
              d={p.path}
              fill={getFill(p.iso2)}
              stroke="hsl(var(--border) / 0.35)"
              strokeWidth="0.3"
              className="transition-colors duration-150"
              onMouseEnter={e => handleHover(e, p.iso2, p.name)}
              onMouseMove={e => handleHover(e, p.iso2, p.name)}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

          {outlinePath && (
            <>
              <path d={outlinePath} fill="url(#cmp-shadow)" pointerEvents="none" />
              <path d={outlinePath} fill="url(#cmp-highlight)" pointerEvents="none" />
            </>
          )}
        </svg>

        {tooltip && !isDragging && (
          <div
            className="absolute pointer-events-none z-50 rounded-md bg-popover text-popover-foreground border border-border px-3 py-1.5 shadow-lg text-sm"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10, transform: 'translateY(-100%)' }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Controls + legend */}
      <div className="flex items-center justify-between w-full pt-3 px-1" style={{ maxWidth: GLOBE_SIZE }}>
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_BOTH }} />
            <span className="text-muted-foreground">Both</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_MINE }} />
            <span className="text-muted-foreground">{myName} only</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_THEIRS }} />
            <span className="text-muted-foreground">{theirName} only</span>
          </span>
        </div>
        {!autoRotate && (
          <button
            onClick={() => setAutoRotate(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Resume rotation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
