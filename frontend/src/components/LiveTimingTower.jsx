import { motion } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';

const TIRE_COLORS = {
  SOFT:   { bg: '#E10600', text: '#FFFFFF', label: 'S' },
  MEDIUM: { bg: '#FFD700', text: '#000000', label: 'M' },
  HARD:   { bg: '#FFFFFF', text: '#000000', label: 'H' },
  INTER:  { bg: '#00D2BE', text: '#000000', label: 'I' },
  WET:    { bg: '#0090FF', text: '#FFFFFF', label: 'W' },
};

const LiveTimingTower = ({
  drivers = [],
  selectedDriverId = null,
  onSelectDriver = () => {},
  currentLap = 1,
  totalLaps = 57,
}) => {
  // Sort drivers based on simulated position / progress
  const sortedDrivers = [...drivers].sort((a, b) => {
    // If different lap, higher lap is ahead
    if ((b.lap || 1) !== (a.lap || 1)) {
      return (b.lap || 1) - (a.lap || 1);
    }
    // Else higher progress is ahead
    return (b.progress || 0) - (a.progress || 0);
  });

  return (
    <div className="w-full flex flex-col rounded-3xl bg-[#090b10] border border-white/10 overflow-hidden shadow-2xl">
      {/* Timing Tower Header */}
      <div className="px-5 py-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-f1red animate-pulse" />
          <span className="text-xs font-mono font-black tracking-[0.2em] uppercase text-white">
            LIVE TIMING TOWER
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-400 font-bold">
          LAP {currentLap} / {totalLaps}
        </span>
      </div>

      {/* Driver Standings Rows */}
      <div className="flex-1 overflow-y-auto max-h-[540px] divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
        {sortedDrivers.map((driver, index) => {
          const isSelected = selectedDriverId === driver.id;
          const isLeader = index === 0;
          const tire = (index % 3 === 0 ? 'SOFT' : index % 2 === 0 ? 'MEDIUM' : 'HARD');
          const tireData = TIRE_COLORS[tire];

          // Compute interval to car ahead
          let intervalDisplay = 'LEADER';
          if (!isLeader) {
            const gapSec = (0.35 + (index * 0.42)).toFixed(3);
            intervalDisplay = `+${gapSec}`;
          }

          return (
            <motion.div
              key={driver.id}
              onClick={() => {
                playPaddleShift(1.0);
                onSelectDriver(isSelected ? null : driver.id);
              }}
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
              className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all duration-150 relative ${
                isSelected ? 'bg-white/10' : ''
              }`}
            >
              {/* Left Livery Color Strip */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                style={{ backgroundColor: driver.color }}
              />

              {/* Left: Position & Driver info */}
              <div className="flex items-center gap-3 min-w-0 pl-1.5">
                {/* Position Number */}
                <span
                  className="w-5 text-center text-xs font-mono font-black shrink-0"
                  style={{ color: isLeader ? '#FFD700' : '#FFFFFF' }}
                >
                  {index + 1}
                </span>

                {/* Driver Avatar / Photo */}
                <div
                  className="w-7 h-7 rounded-full overflow-hidden shrink-0 border flex items-center justify-center bg-black/40"
                  style={{ borderColor: `${driver.color}60` }}
                >
                  {driver.photo ? (
                    <img
                      src={driver.photo}
                      alt={driver.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[9px] font-black" style={{ color: driver.color }}>
                      {driver.code}
                    </span>
                  )}
                </div>

                {/* Name & Code */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-f1heading font-black text-white tracking-wide">
                      {driver.code}
                    </span>
                    <span className="text-[11px] font-sans text-gray-400 truncate hidden sm:inline">
                      {driver.name.split(' ').pop()}
                    </span>
                  </div>
                  <div
                    className="text-[9px] font-mono uppercase truncate font-bold"
                    style={{ color: driver.color }}
                  >
                    {driver.team}
                  </div>
                </div>
              </div>

              {/* Right: Tires, DRS, Interval */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* DRS Active badge */}
                {driver.drsOpen && (
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono font-bold">
                    DRS
                  </span>
                )}

                {/* Tire Badge */}
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-black"
                  style={{ backgroundColor: tireData.bg, color: tireData.text }}
                  title={`Tire Compound: ${tire}`}
                >
                  {tireData.label}
                </span>

                {/* Gap / Interval */}
                <span
                  className="w-14 text-right text-xs font-mono font-bold tabular-nums"
                  style={{ color: isLeader ? '#FFD700' : '#CCCCCC' }}
                >
                  {intervalDisplay}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveTimingTower;
