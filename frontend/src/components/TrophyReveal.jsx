import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const TrophyReveal = ({ championName, points }) => {
  const trophyRef = useRef(null);
  const confettiRef = useRef(null);
  const counterRef = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.from(trophyRef.current, {
      scale: 0,
      rotation: -180,
      duration: 1.2,
      ease: 'back.out(1.7)',
    })
    .to(trophyRef.current, {
      filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))',
      duration: 0.5,
      yoyo: true,
      repeat: 2,
    })
    .from(confettiRef.current?.children || [], {
      opacity: 0,
      y: -100,
      rotation: () => gsap.utils.random(-360, 360),
      duration: 1.5,
      stagger: 0.03,
      ease: 'power2.out',
    }, '-=1');

    if (counterRef.current) {
      gsap.from(counterRef.current, {
        textContent: 0,
        duration: 2,
        ease: 'power1.out',
        snap: { textContent: 1 },
        onUpdate: function () {
          counterRef.current.textContent = Math.ceil(this.targets()[0].textContent);
        },
      });
    }

    // Auto-dismiss after 2.5s
    const dismissTimer = setTimeout(() => setVisible(false), 2500);

    return () => {
      tl.kill();
      clearTimeout(dismissTimer);
    };
  }, [points]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ exit: { duration: 0.4 } }}
          className="fixed inset-0 z-50 bg-dark-900/95 flex items-center justify-center"
          onClick={() => setVisible(false)}
        >
          {/* Confetti */}
          <div ref={confettiRef} className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-f1red"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0,
                }}
              />
            ))}
          </div>

          <div className="text-center relative z-10">
            <div ref={trophyRef} className="text-9xl mb-8">🏆</div>
            <h2 className="text-5xl font-black text-white mb-4">CHAMPION</h2>
            <p className="text-3xl text-f1red font-bold mb-6">{championName}</p>
            <div className="text-6xl font-black text-white">
              <span ref={counterRef}>{points}</span>
              <span className="text-2xl text-gray-400 ml-2">POINTS</span>
            </div>
            <p className="text-gray-500 text-sm mt-6">click anywhere to dismiss</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TrophyReveal;
