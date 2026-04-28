import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const TEAM_COLORS = {
  'Red Bull Racing':  '#3671C6',
  'Mercedes':         '#27F4D2',
  'Ferrari':          '#E8002D',
  'McLaren':          '#FF8000',
  'Aston Martin':     '#229971',
  'Alpine':           '#FF87BC',
  'Williams':         '#64C4FF',
  'AlphaTauri':       '#5E8FAA',
  'RB':               '#6692FF',
  'Alfa Romeo':       '#C92D4B',
  'Kick Sauber':      '#52E252',
  'Haas':             '#B6BABD',
};

const getTeamColor = (teamName) => TEAM_COLORS[teamName] || '#E10600';

const AnimatedLeaderboard = ({ drivers, previousDrivers = [] }) => {
  const pointsRef = useRef([]);

  useEffect(() => {
    pointsRef.current = pointsRef.current.slice(0, drivers.length);
    pointsRef.current.forEach((el, index) => {
      if (el && drivers[index]) {
        const previousPoints = previousDrivers[index]?.points || 0;
        gsap.from(el, {
          textContent: previousPoints,
          duration: 1.5,
          ease: 'power1.out',
          snap: { textContent: 1 },
          onUpdate: function () {
            el.textContent = Math.ceil(this.targets()[0].textContent);
          },
        });
      }
    });
  }, [drivers]);

  const getPositionChange = (currentIndex, driverId) => {
    const previousIndex = previousDrivers.findIndex((d) => d._id === driverId);
    if (previousIndex === -1) return 0;
    return previousIndex - currentIndex;
  };

  const maxPoints = drivers[0]?.points || 1;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {drivers.map((driver, index) => {
          const positionChange = getPositionChange(index, driver._id);
          const teamColor = getTeamColor(driver.team?.name);
          const isLeader = index === 0;
          const barWidth = (driver.points / maxPoints) * 100;

          return (
            <motion.div
              key={driver._id}
              layout
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={`relative glass rounded-xl p-4 flex items-center overflow-hidden transition-all ${
                isLeader ? 'border-2' : 'border border-transparent'
              }`}
              style={{ borderColor: isLeader ? teamColor : undefined }}
            >
              {/* Team color left stripe */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ background: teamColor }}
              />

              <div className="flex items-center space-x-4 flex-1 pl-3">
                {/* Position */}
                <div className="w-10 text-center shrink-0">
                  <span
                    className="text-2xl font-black"
                    style={{ color: isLeader ? teamColor : 'white' }}
                  >
                    {index + 1}
                  </span>
                  {positionChange !== 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs mt-0.5"
                    >
                      {positionChange > 0 ? (
                        <span className="text-green-400">▲{positionChange}</span>
                      ) : (
                        <span className="text-red-400">▼{Math.abs(positionChange)}</span>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {driver.imageUrl ? (
                    <img
                      src={driver.imageUrl}
                      alt={driver.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                      style={{ border: `2px solid ${teamColor}` }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0"
                      style={{ background: `${teamColor}22`, color: teamColor }}
                    >
                      {driver.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate">{driver.name}</div>
                    <div className="text-sm truncate" style={{ color: teamColor }}>
                      {driver.team?.name}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex space-x-6 text-center shrink-0">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Wins</div>
                    <div className="font-bold">{driver.wins}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Podiums</div>
                    <div className="font-bold">{driver.podiums}</div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <div className="text-3xl font-black" style={{ color: teamColor }}>
                    <span ref={(el) => (pointsRef.current[index] = el)}>
                      {driver.points}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Points</div>
                </div>
              </div>

              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-[3px]"
                style={{ background: teamColor }}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.05 }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedLeaderboard;
