import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const AnimatedLeaderboard = ({ drivers, previousDrivers = [] }) => {
  const rowsRef = useRef([]);
  const pointsRef = useRef([]);

  useEffect(() => {
    // Animate points counters
    pointsRef.current.forEach((el, index) => {
      if (el && drivers[index]) {
        const targetPoints = drivers[index].points;
        const previousPoints = previousDrivers[index]?.points || 0;
        
        gsap.from(el, {
          textContent: previousPoints,
          duration: 1.5,
          ease: 'power1.out',
          snap: { textContent: 1 },
          onUpdate: function() {
            el.textContent = Math.ceil(this.targets()[0].textContent);
          },
        });
      }
    });
  }, [drivers, previousDrivers]);

  const getPositionChange = (currentIndex, driverId) => {
    const previousIndex = previousDrivers.findIndex(d => d._id === driverId);
    if (previousIndex === -1) return 0;
    return previousIndex - currentIndex;
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {drivers.map((driver, index) => {
          const positionChange = getPositionChange(index, driver._id);
          
          return (
            <motion.div
              key={driver._id}
              ref={(el) => (rowsRef.current[index] = el)}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`glass rounded-lg p-4 flex items-center justify-between hover:border-f1red transition-all ${
                index === 0 ? 'border-2 border-f1red' : ''
              }`}
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* Position */}
                <div className="w-12 text-center">
                  <span className={`text-2xl font-black ${index === 0 ? 'text-f1red' : 'text-white'}`}>
                    {index + 1}
                  </span>
                  
                  {/* Position Change Indicator */}
                  {positionChange !== 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs mt-1"
                    >
                      {positionChange > 0 ? (
                        <span className="text-green-500">▲ {positionChange}</span>
                      ) : (
                        <span className="text-red-500">▼ {Math.abs(positionChange)}</span>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Driver Info */}
                <div className="flex items-center space-x-3 flex-1">
                  {driver.imageUrl ? (
                    <img
                      src={driver.imageUrl}
                      alt={driver.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-f1red"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold">
                      {driver.name.charAt(0)}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="font-bold text-lg">{driver.name}</div>
                    <div className="text-sm text-gray-400">{driver.team?.name}</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden md:flex space-x-6 text-center">
                  <div>
                    <div className="text-xs text-gray-500">WINS</div>
                    <div className="font-bold">{driver.wins}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">PODIUMS</div>
                    <div className="font-bold">{driver.podiums}</div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="text-3xl font-black text-f1red">
                    <span ref={(el) => (pointsRef.current[index] = el)}>
                      {driver.points}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">POINTS</div>
                </div>
              </div>

              {/* Progress Bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-f1red"
                initial={{ width: 0 }}
                animate={{ width: `${(driver.points / (drivers[0]?.points || 1)) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedLeaderboard;
