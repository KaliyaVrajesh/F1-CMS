import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { getTeamColor, getTeamLogoUrl } from '../utils/teamColors';

const TeamLogo = ({ constructor, color }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = constructor.logoUrl || getTeamLogoUrl(constructor);

  if (!imgError && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={constructor.name}
        className="w-14 h-9 object-contain shrink-0 p-0.5 rounded bg-black/20"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="w-14 h-9 rounded flex items-center justify-center text-xs font-black shrink-0 border"
      style={{ background: `${color}20`, color, borderColor: `${color}40` }}
    >
      {(constructor.name || 'F1').substring(0, 3).toUpperCase()}
    </div>
  );
};

const AnimatedConstructorLeaderboard = ({ constructors }) => {
  const pointsRef = useRef([]);

  useEffect(() => {
    pointsRef.current = pointsRef.current.slice(0, constructors.length);
    pointsRef.current.forEach((el) => {
      if (!el) return;
      gsap.from(el, {
        textContent: 0,
        duration: 1.6,
        ease: 'power1.out',
        snap: { textContent: 1 },
        onUpdate: function () {
          el.textContent = Math.ceil(this.targets()[0].textContent);
        },
      });
    });
  }, [constructors]);

  const maxPoints = constructors[0]?.points || 1;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {constructors.map((constructor, index) => {
          const color = constructor.colour || getTeamColor(constructor.name || constructor._id);
          const barWidth = (constructor.points / maxPoints) * 100;
          const isLeader = index === 0;

          return (
            <motion.div
              key={constructor._id}
              layout
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.45, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
              className={`relative glass rounded-xl p-4 flex items-center justify-between overflow-hidden hover:border-opacity-80 transition-all ${
                isLeader ? 'border-2' : 'border border-transparent'
              }`}
              style={{ borderColor: isLeader ? color : undefined }}
            >
              {/* Team color left stripe */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ background: color }}
              />

              <div className="flex items-center space-x-4 flex-1 pl-3">
                {/* Position */}
                <div className="w-10 text-center shrink-0">
                  <span
                    className="text-2xl font-black"
                    style={{ color: isLeader ? color : 'white' }}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Logo + Name */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <TeamLogo constructor={constructor} color={color} />
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate">{constructor.name}</div>
                    <div className="text-xs text-gray-400">{constructor.country}</div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <div className="text-3xl font-black" style={{ color }}>
                    <span ref={(el) => (pointsRef.current[index] = el)}>
                      {constructor.points}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Points</div>
                </div>
              </div>

              {/* Progress bar at bottom */}
              <motion.div
                className="absolute bottom-0 left-0 h-[3px]"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.055 }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedConstructorLeaderboard;
