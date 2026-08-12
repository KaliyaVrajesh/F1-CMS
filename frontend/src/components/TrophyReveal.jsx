import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TrophyReveal = ({ championName, points, wins, team, season, onClose }) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    // ESC key to close
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 w-full max-w-lg rounded-3xl overflow-hidden glass border border-amber-500/40 p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20, 22, 32, 0.98) 0%, rgba(10, 12, 18, 0.98) 100%)',
              boxShadow: '0 0 50px rgba(255, 215, 0, 0.2), 0 20px 40px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 cursor-pointer text-sm"
              title="Close"
            >
              ✕
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-amber-400 text-sm">🏆</span>
              <span className="text-[11px] font-mono font-black tracking-[0.25em] uppercase text-amber-400">
                FIA FORMULA 1 WORLD CHAMPIONSHIP
              </span>
            </div>

            <p className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">
              {season ? `${season} World Drivers' Champion` : "World Drivers' Champion"}
            </p>

            {/* ── Sketchfab 3D Embed Wrapper ── */}
            <div className="sketchfab-embed-wrapper w-full mb-4">
              <div className="w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border border-amber-500/30 bg-black/80 shadow-inner relative">
                <iframe
                  title="F1 Trophy - FIA World Drivers Championship"
                  frameBorder="0"
                  allowFullScreen
                  mozallowfullscreen="true"
                  webkitallowfullscreen="true"
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                  xr-spatial-tracking="true"
                  execution-while-out-of-viewport="true"
                  execution-while-not-rendered="true"
                  web-share="true"
                  src="https://sketchfab.com/models/8fe54d7db58c4985a393d0e7567deaaa/embed"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Champion Driver Name */}
            <h2
              className="text-3xl sm:text-4xl font-f1heading font-black tracking-wide uppercase mb-1"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 20%, #FFD700 80%, #FFA500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {championName}
            </h2>

            {/* Team */}
            {team && (
              <p className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase mb-3">
                {team}
              </p>
            )}

            {/* Points & Stats */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/10 w-full mt-1">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-f1heading font-black text-white tabular-nums">
                  {points}
                </div>
                <div className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
                  POINTS
                </div>
              </div>

              {wins !== undefined && wins !== null && (
                <>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-f1heading font-black text-amber-400 tabular-nums">
                      {wins}
                    </div>
                    <div className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
                      WINS
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dismiss note */}
            <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase mt-4">
              Click anywhere or press ESC to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TrophyReveal;
