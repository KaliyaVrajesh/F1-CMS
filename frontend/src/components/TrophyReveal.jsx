import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

// ─── Pure SVG FIA WDC Trophy ──────────────────────────────────────────────────
// Matches the real trophy: tall trumpet vase, silver body, gold rings, blue gem,
// lotus petal base, wide flared rim.
const F1Trophy = ({ glowRef }) => (
  <svg
    ref={glowRef}
    viewBox="0 0 220 380"
    width="200"
    height="346"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 0 28px rgba(200,180,80,0.7))' }}
  >
    <defs>
      {/* Silver body gradient */}
      <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#2a2a2a" />
        <stop offset="18%"  stopColor="#888" />
        <stop offset="38%"  stopColor="#e8e8e8" />
        <stop offset="52%"  stopColor="#ffffff" />
        <stop offset="65%"  stopColor="#d0d0d0" />
        <stop offset="82%"  stopColor="#777" />
        <stop offset="100%" stopColor="#1a1a1a" />
      </linearGradient>
      {/* Gold rings */}
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#3a2e00" />
        <stop offset="25%"  stopColor="#b8860b" />
        <stop offset="50%"  stopColor="#ffd700" />
        <stop offset="70%"  stopColor="#daa520" />
        <stop offset="100%" stopColor="#3a2e00" />
      </linearGradient>
      {/* Dark gold for detail */}
      <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#1a1400" />
        <stop offset="40%"  stopColor="#8b6914" />
        <stop offset="60%"  stopColor="#c8960c" />
        <stop offset="100%" stopColor="#1a1400" />
      </linearGradient>
      {/* Base gradient */}
      <linearGradient id="base" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#111" />
        <stop offset="30%"  stopColor="#666" />
        <stop offset="50%"  stopColor="#bbb" />
        <stop offset="70%"  stopColor="#666" />
        <stop offset="100%" stopColor="#111" />
      </linearGradient>
      {/* Rim gradient */}
      <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#111" />
        <stop offset="20%"  stopColor="#777" />
        <stop offset="45%"  stopColor="#f0f0f0" />
        <stop offset="55%"  stopColor="#ffffff" />
        <stop offset="80%"  stopColor="#777" />
        <stop offset="100%" stopColor="#111" />
      </linearGradient>
      {/* Shine overlay */}
      <linearGradient id="shine" x1="15%" y1="0%" x2="45%" y2="100%">
        <stop offset="0%"   stopColor="rgba(255,255,255,0.45)" />
        <stop offset="40%"  stopColor="rgba(255,255,255,0.15)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
      {/* Blue gem */}
      <radialGradient id="gem" cx="35%" cy="30%">
        <stop offset="0%"   stopColor="#88ccff" />
        <stop offset="40%"  stopColor="#1a6abf" />
        <stop offset="100%" stopColor="#0a2a5e" />
      </radialGradient>
    </defs>

    {/* ── Circular base disc ── */}
    <ellipse cx="110" cy="355" rx="72" ry="14" fill="url(#base)" />
    <ellipse cx="110" cy="350" rx="68" ry="11" fill="url(#silver)" />
    <ellipse cx="110" cy="346" rx="60" ry="8"  fill="url(#goldDark)" />

    {/* ── Lotus petal collar (above base) ── */}
    {Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const cx = 110 + Math.cos(angle) * 38;
      const cy = 330 + Math.sin(angle) * 9;
      return (
        <ellipse key={i} cx={cx} cy={cy} rx="9" ry="14"
          fill="url(#goldDark)"
          transform={`rotate(${(i / 16) * 360}, ${cx}, ${cy})`}
          opacity="0.9"
        />
      );
    })}
    {/* Collar ring */}
    <ellipse cx="110" cy="325" rx="44" ry="10" fill="url(#gold)" />
    <ellipse cx="110" cy="322" rx="38" ry="7"  fill="url(#goldDark)" />

    {/* ── Lower blue gem ── */}
    <circle cx="110" cy="318" r="6" fill="url(#gem)" />
    <circle cx="108" cy="316" r="2" fill="rgba(255,255,255,0.6)" />

    {/* ── Main body — tall trumpet/vase shape ── */}
    {/* The body narrows from ~38px wide at bottom to ~80px at top */}
    <path
      d="M72 318 
         C70 300 66 280 64 260 
         C62 240 60 220 60 200 
         C60 180 62 160 66 140 
         C70 120 76 105 84 95 
         C90 88 100 84 110 84
         C120 84 130 88 136 95
         C144 105 150 120 154 140
         C158 160 160 180 160 200
         C160 220 158 240 156 260
         C154 280 150 300 148 318
         Z"
      fill="url(#silver)"
    />
    {/* Shine on body */}
    <path
      d="M72 318 
         C70 300 66 280 64 260 
         C62 240 60 220 60 200 
         C60 180 62 160 66 140 
         C70 120 76 105 84 95 
         C90 88 100 84 110 84
         C120 84 130 88 136 95
         C144 105 150 120 154 140
         C158 160 160 180 160 200
         C160 220 158 240 156 260
         C154 280 150 300 148 318
         Z"
      fill="url(#shine)"
    />

    {/* ── Gold horizontal rings wrapping the body ── */}
    {/* 10 rings spaced from y=130 to y=310 */}
    {Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      // Body width at this y position (narrows toward bottom)
      const y = 130 + t * 180;
      // Interpolate body half-width: ~50 at top (y=130), ~38 at bottom (y=310)
      const hw = 50 - t * 12;
      return (
        <g key={i}>
          <ellipse cx="110" cy={y} rx={hw} ry="4.5" fill="url(#gold)" />
          <ellipse cx="110" cy={y - 1} rx={hw - 2} ry="2" fill="rgba(255,240,100,0.35)" />
        </g>
      );
    })}

    {/* ── Upper blue gem on body ── */}
    <circle cx="110" cy="175" r="8" fill="url(#gem)" />
    <circle cx="107" cy="172" r="3" fill="rgba(255,255,255,0.55)" />
    {/* Gold bezel around gem */}
    <circle cx="110" cy="175" r="10" fill="none" stroke="url(#gold)" strokeWidth="2.5" />

    {/* ── Wide flared rim at top ── */}
    {/* Outer rim — wide ellipse */}
    <ellipse cx="110" cy="88" rx="82" ry="18" fill="url(#rim)" />
    {/* Inner rim shadow */}
    <ellipse cx="110" cy="88" rx="72" ry="13" fill="#1a1a1a" />
    {/* Rim gold trim */}
    <ellipse cx="110" cy="84" rx="80" ry="16" fill="none" stroke="url(#gold)" strokeWidth="3" />
    {/* Rim inner gold trim */}
    <ellipse cx="110" cy="88" rx="68" ry="12" fill="none" stroke="url(#goldDark)" strokeWidth="1.5" />

    {/* ── Rim top edge highlight ── */}
    <ellipse cx="110" cy="82" rx="78" ry="14" fill="none"
      stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

    {/* ── Engraved lines on body (subtle) ── */}
    {Array.from({ length: 6 }, (_, i) => {
      const y = 145 + i * 26;
      const t = (y - 130) / 180;
      const hw = 48 - t * 11;
      return (
        <ellipse key={i} cx="110" cy={y + 13} rx={hw - 1} ry="1.5"
          fill="none" stroke="rgba(180,180,180,0.25)" strokeWidth="0.8" />
      );
    })}
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────
const TrophyReveal = ({ championName, points }) => {
  const trophyRef  = useRef(null);
  const confettiRef = useRef(null);
  const counterRef  = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tl = gsap.timeline();

    // Trophy drops in with bounce
    tl.from(trophyRef.current, {
      y: -80, scale: 0.4, opacity: 0,
      duration: 1.0, ease: 'back.out(1.8)',
    })
    // Pulse glow
    .to(trophyRef.current, {
      filter: 'drop-shadow(0 0 40px rgba(255,215,0,1))',
      duration: 0.4, yoyo: true, repeat: 3, ease: 'power1.inOut',
    })
    // Confetti burst
    .from(confettiRef.current?.children || [], {
      opacity: 0, y: -80, scale: 0,
      rotation: () => gsap.utils.random(-360, 360),
      duration: 1.2, stagger: 0.02, ease: 'power2.out',
    }, '-=0.8');

    // Points counter
    if (counterRef.current) {
      gsap.from(counterRef.current, {
        textContent: 0, duration: 2, delay: 0.5,
        ease: 'power1.out', snap: { textContent: 1 },
        onUpdate() {
          if (counterRef.current)
            counterRef.current.textContent = Math.ceil(this.targets()[0].textContent);
        },
      });
    }

    const t = setTimeout(() => setVisible(false), 4000);
    return () => { tl.kill(); clearTimeout(t); };
  }, [points]);

  // Confetti colours — F1 themed
  const confettiColors = ['#E10600','#FFD700','#ffffff','#ff6b00','#3671C6'];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ exit: { duration: 0.35 } }}
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(6px)' }}
          onClick={() => setVisible(false)}
        >
          {/* Confetti */}
          <div ref={confettiRef} className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(60)].map((_, i) => (
              <div key={i} className="absolute rounded-sm"
                style={{
                  width:  `${Math.random() * 10 + 4}px`,
                  height: `${Math.random() * 6  + 3}px`,
                  left:   `${Math.random() * 100}%`,
                  top:    `${Math.random() * 100}%`,
                  background: confettiColors[i % confettiColors.length],
                  opacity: 0,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* Trophy SVG */}
            <div ref={trophyRef}>
              <F1Trophy />
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-5xl font-f1heading font-black text-white mt-4 mb-2 uppercase tracking-wider"
            >
              Champion
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="text-3xl font-bold mb-4"
              style={{ color: '#FFD700' }}
            >
              {championName}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-5xl font-f1heading font-black text-white"
            >
              <span ref={counterRef}>{points}</span>
              <span className="text-xl text-gray-400 ml-2">PTS</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="text-gray-600 text-xs mt-5 uppercase tracking-widest"
            >
              click anywhere to dismiss
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TrophyReveal;
