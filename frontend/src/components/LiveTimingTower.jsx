import { motion } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';
import { getTeamName } from '../utils/teamColors';

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
  lapDurationSec = 88.0,
}) => {
  // Sort drivers based on simulated lap and track progress
  const sortedDrivers = [...drivers].sort((a, b) => {
    if ((b.lap || 1) !== (a.lap || 1)) {
      return (b.lap || 1) - (a.lap || 1);
    }
    return (b.progress || 0) - (a.progress || 0);
  });

  const leader = sortedDrivers[0];

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
          const tire = driver.tire || (index % 3 === 0 ? 'SOFT' : index % 2 === 0 ? 'MEDIUM' : 'HARD');
          const tireData = TIRE_COLORS[tire] || TIRE_COLORS.MEDIUM;
          const teamDisplayName = getTeamName(driver.team, driver) || (typeof driver.team === 'string' ? driver.team : 'F1 Team');

          // Compute real dynamic time gap based on track progress and authentic lap time
          let intervalDisplay = 'LEADER';
          if (!isLeader && leader) {
            const lapDiff = (leader.lap || 1) - (driver.lap || 1);
            let progressDiff = (leader.progress || 0) - (driver.progress || 0);
            if (progressDiff < 0) progressDiff += 1.0;
            const totalGapSec = lapDiff * lapDurationSec + progressDiff * lapDurationSec;

            if (lapDiff >= 1) {
              intervalDisplay = `+${lapDiff} LAP`;
            } else if (totalGapSec > 0.05) {
              intervalDisplay = `+${totalGapSec.toFixed(3)}s`;
            } else {
              intervalDisplay = `+${(0.05 + index * 0.12).toFixed(3)}s`;
            }
          }

          // Format benchmark lap time
          const baseMinutes = Math.floor(lapDurationSec / 60);
          const baseSecs = (lapDurationSec % 60 + index * 0.18).toFixed(3);
          const formattedLapTime = `${baseMinutes}:${baseSecs < 10 ? '0' : ''}${baseSecs}`;

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
                    {teamDisplayName}
                  </div>
                </div>
              </div>

              {/* Right: Tires, DRS, Gap */}
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
                <div className="w-16 text-right">
                  <div
                    className="text-xs font-mono font-bold tabular-nums"
                    style={{ color: isLeader ? '#FFD700' : '#CCCCCC' }}
                  >
                    {intervalDisplay}
                  </div>
                  <div className="text-[9px] font-mono text-gray-500 tabular-nums">
                    {formattedLapTime}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveTimingTower;
