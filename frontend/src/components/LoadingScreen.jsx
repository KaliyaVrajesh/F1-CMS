import { useEffect, useRef, useState } from 'react';

const LoadingScreen = ({ isLoading, loadPercent }) => {
  const [progress, setProgress]   = useState(0);
  const [phase, setPhase]         = useState('writing');
  const [visible, setVisible]     = useState(false);
  const [exiting, setExiting]     = useState(false);

  // Show on mount
  useEffect(() => { setVisible(true); }, []);

  // Sync progress from real asset loading, never go backward
  useEffect(() => {
    if (typeof loadPercent === 'number') {
      setProgress(prev => Math.max(prev, loadPercent));
      if (loadPercent > 30) setPhase('text');
    }
  }, [loadPercent]);

  // Exit animation when done
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => setVisible(false), 700);
      }, 400);
    }
  }, [isLoading]);

  if (!visible) return null;

  const r    = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - progress / 100);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: '#050505',
        opacity:  exiting ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: exiting ? 'none' : 'all',
      }}
    >
      {/* Subtle starfield */}
      <Stars />

      {/* Red ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 55%, rgba(225,6,0,0.06) 0%, transparent 70%)' }} />

      {/* ── Main visual ── */}
      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Ring + F1 centre */}
        <div className="relative w-40 h-40">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
            {/* Track marks */}
            {Array.from({ length: 48 }, (_, i) => {
              const a   = (i / 48) * 360 - 90;
              const rad = a * Math.PI / 180;
              const long = i % 4 === 0;
              const r1 = long ? 48 : 50, r2 = 54;
              return (
                <line key={i}
                  x1={60 + r1 * Math.cos(rad)} y1={60 + r1 * Math.sin(rad)}
                  x2={60 + r2 * Math.cos(rad)} y2={60 + r2 * Math.sin(rad)}
                  stroke={long ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth={long ? 1.5 : 1}
                />
              );
            })}
            {/* Base ring */}
            <circle cx="60" cy="60" r={r} fill="none"
              stroke="rgba(225,6,0,0.08)" strokeWidth="3" />
            {/* Progress arc */}
            <circle cx="60" cy="60" r={r} fill="none"
              stroke="#E10600" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              transform="rotate(-90 60 60)"
              style={{
                transition: 'stroke-dashoffset 0.12s linear',
                filter: 'drop-shadow(0 0 8px rgba(225,6,0,0.9))',
              }}
            />
            {/* Dot at progress head */}
            {(() => {
              const a   = (-90 + (progress / 100) * 360) * Math.PI / 180;
              return (
                <circle
                  cx={60 + r * Math.cos(a)} cy={60 + r * Math.sin(a)}
                  r="4" fill="#E10600"
                  style={{ filter: 'drop-shadow(0 0 6px #E10600)' }}
                />
              );
            })()}
          </svg>

          {/* Centre logo */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="font-f1heading font-black text-4xl leading-none"
              style={{ color: '#E10600', textShadow: '0 0 24px rgba(225,6,0,0.5)' }}>
              F1
            </span>
            <span className="text-[0.38rem] tracking-[0.5em] text-gray-700 uppercase">
              CMS
            </span>
          </div>
        </div>

        {/* Cursive SVG writing then reveal */}
        <WritingText phase={phase} />

        {/* Status + bar */}
        <div className="flex flex-col items-center gap-3 w-64">
          <div className="relative w-full h-[2px] bg-gray-900 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #8B0000, #E10600, #ff6640)',
                boxShadow: '0 0 10px rgba(225,6,0,0.7)',
                transition: 'width 0.12s linear',
              }}
            />
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-gray-700 text-[0.58rem] tracking-[0.35em] uppercase font-mono">
              {progress < 25  ? 'Initialising'    :
               progress < 55  ? 'Loading assets'  :
               progress < 80  ? 'Preparing race'  :
               progress < 98  ? 'On the grid'     : 'Lights out'}
            </span>
            <span className="text-gray-700 text-[0.58rem] font-mono tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-7 text-gray-800 text-[0.55rem] tracking-[0.6em] uppercase">
        The Pinnacle of Motorsport
      </div>
    </div>
  );
};

// ── Cursive SVG writing animation ─────────────────────────────────────────────
const LETTER_PATHS = [
  // F - "FORMULA"
  "M 6,36 L 6,8 L 22,8 M 6,22 L 20,22",
  // O
  "M 30,22 Q 30,8 40,8 Q 50,8 50,22 Q 50,36 40,36 Q 30,36 30,22",
  // R
  "M 57,36 L 57,8 Q 70,8 70,18 Q 70,26 57,26 M 62,26 L 73,36",
  // M
  "M 80,36 L 80,8 L 90,24 L 100,8 L 100,36",
  // U
  "M 107,8 L 107,26 Q 107,36 116,36 Q 125,36 125,26 L 125,8",
  // L
  "M 132,8 L 132,36 L 144,36",
  // A
  "M 152,36 L 160,8 L 168,36 M 154,27 L 166,27",
  // space + 1
  "M 185,36 L 185,8 M 179,15 L 185,8",
];

const WritingText = ({ phase }) => {
  const pathsRef = useRef([]);
  const [lengths, setLengths]   = useState([]);
  const [drawn, setDrawn]       = useState([]);
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    const lens = pathsRef.current.map(p => {
      try { return p?.getTotalLength() ?? 40; } catch { return 40; }
    });
    setLengths(lens);
    setDrawn(lens.map(() => 0));
  }, []);

  useEffect(() => {
    if (phase !== 'text' || lengths.length === 0) return;

    const totalDur = 1600;
    const perLetter = totalDur / LETTER_PATHS.length;
    let start = performance.now();
    let rafId;

    const tick = (now) => {
      const elapsed = now - start;
      const newDrawn = lengths.map((len, i) => {
        const letterStart = i * perLetter * 0.7;
        const letterElapsed = elapsed - letterStart;
        if (letterElapsed <= 0) return 0;
        const t = Math.min(1, letterElapsed / (perLetter * 1.1));
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        return ease * len;
      });
      setDrawn(newDrawn);

      const allDone = newDrawn.every((d, i) => d >= lengths[i] * 0.98);
      if (!allDone) {
        rafId = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setShowLabel(true), 100);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, lengths]);

  return (
    <div className="relative h-12 w-72 flex items-center justify-center">
      {/* SVG cursive writing — fades out once text label fades in */}
      <svg viewBox="0 0 200 44" className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible', opacity: showLabel ? 0 : 1, transition: 'opacity 0.4s ease' }}>
        <defs>
          <filter id="glow-write" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {LETTER_PATHS.map((d, i) => (
          <path key={i}
            ref={el => pathsRef.current[i] = el}
            d={d}
            fill="none"
            stroke="#E10600"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={lengths[i] ?? 40}
            strokeDashoffset={(lengths[i] ?? 40) - (drawn[i] ?? 0)}
            filter="url(#glow-write)"
            style={{ transition: 'none' }}
          />
        ))}
      </svg>

      {/* Clean text fades in after writing completes — replaces the SVG */}
      <div
        className="font-f1heading font-black text-xl uppercase tracking-[0.3em] z-10"
        style={{
          color: '#E10600',
          opacity: showLabel ? 1 : 0,
          transition: 'opacity 0.5s ease',
          textShadow: '0 0 20px rgba(225,6,0,0.4)',
          letterSpacing: '0.3em',
        }}
      >
        Formula&nbsp;<span style={{ color: '#ffffff' }}>1</span>
      </div>
    </div>
  );
};

// ── Starfield ──────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 90 }, (_, i) => ({
  left: `${((i * 173.3) % 100).toFixed(2)}%`,
  top:  `${((i * 97.1 + 11) % 100).toFixed(2)}%`,
  size: i % 9 === 0 ? 2 : 1,
  opacity: (0.08 + (i % 6) * 0.06).toFixed(2),
}));

const Stars = () => (
  <div className="absolute inset-0 pointer-events-none">
    {STARS.map((s, i) => (
      <div key={i} className="absolute rounded-full bg-white"
        style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity }} />
    ))}
  </div>
);

export default LoadingScreen;
