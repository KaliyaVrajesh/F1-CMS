import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { playPaddleShift } from '../utils/audio';

const TrophyReveal = ({ championName, points, wins, team, season, onClose }) => {
  const cardRef     = useRef(null);
  const confettiRef = useRef(null);
  const counterRef  = useRef(null);
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    playPaddleShift(0.9);
    setVisible(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    // ESC key listener to dismiss modal
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline();

    // Modal Card pop-in with bounce
    if (cardRef.current) {
      tl.from(cardRef.current, {
        y: 40,
        scale: 0.85,
        opacity: 0,
        duration: 0.8,
        ease: 'back.out(1.6)',
      });
    }

    // Confetti burst
    if (confettiRef.current) {
      tl.from(
        confettiRef.current.children || [],
        {
          opacity: 0,
          y: -100,
          scale: 0,
          rotation: () => gsap.utils.random(-360, 360),
          duration: 1.4,
          stagger: 0.015,
          ease: 'power2.out',
        },
        '-=0.5'
      );
    }

    // Points odometer counter
    if (counterRef.current && points) {
      const targetPoints = parseFloat(points) || 0;
      const countObj = { val: 0 };
      gsap.to(countObj, {
        val: targetPoints,
        duration: 1.8,
        delay: 0.3,
        ease: 'power2.out',
        onUpdate() {
          if (counterRef.current) {
            counterRef.current.textContent = countObj.val.toFixed(targetPoints % 1 !== 0 ? 1 : 0);
          }
        },
      });
    }

    return () => {
      tl.kill();
    };
  }, [points]);

  // F1 Championship Gold & Red Confetti colors
  const confettiColors = ['#FFD700', '#FFA500', '#E10600', '#FFFFFF', '#FFE066', '#3671C6'];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(3, 4, 8, 0.92)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* Celebratory Confetti Particles */}
          <div ref={confettiRef} className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {[...Array(55)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-sm"
                style={{
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 6 + 3}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: confettiColors[i % confettiColors.length],
                  opacity: 0.85,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          {/* Modal Container */}
          <div
            ref={cardRef}
            className="relative z-20 w-full max-w-xl rounded-3xl overflow-hidden glass border border-amber-500/30 p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(16, 18, 28, 0.95) 0%, rgba(8, 9, 15, 0.98) 100%)',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
              title="Close"
            >
              ✕
            </button>

            {/* Ambient Gold Spotlight Glow */}
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, rgba(225, 6, 0, 0.05) 70%, transparent 100%)' }}
            />

            {/* FIA World Championship Header Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-sm">🏆</span>
              <span className="text-[11px] font-mono font-black tracking-[0.3em] uppercase text-amber-400/90">
                FIA FORMULA 1 WORLD CHAMPIONSHIP
              </span>
            </div>

            <h3 className="text-xs font-mono font-bold tracking-[0.25em] uppercase text-gray-400 mb-4">
              {season ? `${season} WORLD DRIVERS' CHAMPION` : "WORLD DRIVERS' CHAMPION"}
            </h3>

            {/* ── 3D Interactive Sketchfab Trophy Embed ── */}
            <div className="relative w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden mb-4 border border-amber-500/20 bg-black/40 shadow-inner group">
              <iframe
                title="F1 Trophy - FIA World Drivers Championship"
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                mozallowfullscreen="true"
                webkitallowfullscreen="true"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                src="https://sketchfab.com/models/8fe54d7db58c4985a393d0e7567deaaa/embed?autostart=1&transparent=1&ui_theme=dark&dnt=1"
              />

              {/* Interactive Rotate Hint Badge */}
              <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black/75 border border-white/10 text-[10px] font-mono text-gray-300 pointer-events-none backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-opacity">
                🖱️ Drag to rotate 3D
              </div>
            </div>

            {/* Champion Driver Name */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl sm:text-4xl font-f1heading font-black tracking-wide uppercase mb-1"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 20%, #FFD700 80%, #FFA500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {championName}
            </motion.h2>

            {/* Team Pill */}
            {team && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase mb-4"
              >
                {team}
              </motion.p>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/10 w-full">
              {/* Points */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-f1heading font-black text-white tabular-nums">
                  <span ref={counterRef}>0</span>
                </div>
                <div className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
                  TOTAL POINTS
                </div>
              </div>

              {/* Wins */}
              {wins !== undefined && wins !== null && (
                <>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-f1heading font-black text-amber-400 tabular-nums">
                      {wins}
                    </div>
                    <div className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
                      GRAND PRIX WINS
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dismiss Hint */}
            <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase mt-5">
              Click outside or press ESC to close
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TrophyReveal;
