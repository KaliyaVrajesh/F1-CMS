import { useState } from 'react';
import { motion } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';
import { getTeamCode, getTeamName } from '../utils/teamColors';

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
  const [timingMode, setTimingMode] = useState('INTERVAL'); // 'INTERVAL' | 'GAP_LEADER'

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
      {/* ── Timing Tower Header (MultiViewer Style) ── */}
      <div className="px-4 py-3 bg-black/70 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-f1red animate-pulse" />
          <span className="text-xs font-mono font-black tracking-[0.15em] uppercase text-white">
            LIVE TIMING TOWER
          </span>
          <span className="px-1.5 py-0.2 rounded bg-red-600/20 text-red-500 text-[9px] font-mono font-black uppercase">
            RACE
          </span>
        </div>

        {/* Mode Toggle & Lap Counter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimingMode((m) => (m === 'INTERVAL' ? 'GAP_LEADER' : 'INTERVAL'))}
            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-mono text-gray-300 font-bold border border-white/10 transition-all"
            title="Toggle Interval to Car Ahead / Gap to Leader"
          >
            {timingMode === 'INTERVAL' ? '⏱️ INTERVAL' : '🏁 TO LEADER'}
          </button>
          <span className="text-[11px] font-mono text-gray-400 font-bold">
            LAP {currentLap} / {totalLaps}
          </span>
        </div>
      </div>

      {/* ── Driver Standings Rows (MultiViewer Style) ── */}
      <div className="flex-1 overflow-y-auto max-h-[560px] divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
        {/* Active Drivers */}
        {sortedDrivers
          .filter((d) => !d.isRetired)
          .map((driver, index) => {
            const isSelected = selectedDriverId === driver.id;
            const isLeader = index === 0;
            const tire = driver.tire || (index % 3 === 0 ? 'SOFT' : index % 2 === 0 ? 'MEDIUM' : 'HARD');
            const tireData = TIRE_COLORS[tire] || TIRE_COLORS.MEDIUM;
            const teamCode = getTeamCode(driver.team, driver);
            const tireAge = driver.tireAge || Math.max(1, (currentLap % 22) + 1);
            const pitCount = driver.pitCount !== undefined ? driver.pitCount : driver.pitted ? 1 : 0;
            const posChange = driver.posChange !== undefined ? driver.posChange : 0;

            // Compute interval to car ahead and gap to leader
            let gapDisplay = 'LEADER';
            if (driver.inPit || driver.pitState === 'IN_BOX') {
              gapDisplay = driver.pitState === 'IN_BOX' ? '🔧 BOX 2.4s' : '🔧 IN PIT';
            } else if (!isLeader && leader) {
              const lapDiff = (leader.lap || 1) - (driver.lap || 1);
              let progressDiff = (leader.progress || 0) - (driver.progress || 0);
              if (progressDiff < 0) progressDiff += 1.0;
              const totalGapSec = lapDiff * lapDurationSec + progressDiff * lapDurationSec;

              if (timingMode === 'INTERVAL') {
                const intervalVal =
                  driver.intervalToCarAheadSec !== undefined
                    ? driver.intervalToCarAheadSec
                    : Math.max(0.2, totalGapSec / (index || 1));
                gapDisplay = `+${intervalVal.toFixed(3)}`;
              } else {
                if (lapDiff >= 1) {
                  gapDisplay = `+${lapDiff} LAP`;
                } else {
                  gapDisplay = `+${totalGapSec.toFixed(3)}`;
                }
              }
            }

            return (
              <motion.div
                key={driver.id}
                onClick={() => {
                  playPaddleShift(1.0);
                  onSelectDriver(isSelected ? null : driver.id);
                }}
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-all duration-150 relative text-xs font-mono ${
                  isSelected ? 'bg-white/10' : ''
                }`}
              >
                {/* Left Livery Color Strip */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                  style={{ backgroundColor: driver.color }}
                />

                {/* ── Left Section: Pos, TeamCode, DriverCode, PosChange ── */}
                <div className="flex items-center gap-2 min-w-0 pl-1.5">
                  {/* Position Badge (P1 is Red Box like MultiViewer) */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isLeader ? 'bg-f1red text-white' : 'bg-white/5 text-gray-200'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Team Code + Driver Code (e.g. RBR VER, FER HAM) */}
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[10px] font-black uppercase text-gray-400">
                      {teamCode}
                    </span>
                    <span
                      className="text-xs font-f1heading font-black tracking-wider"
                      style={{ color: isLeader ? '#FFD700' : '#FFFFFF' }}
                    >
                      {driver.code}
                    </span>
                  </div>

                  {/* Position Change Delta (▲2 green, ▼1 red, -) */}
                  <span
                    className={`text-[9px] font-bold shrink-0 ${
                      posChange > 0
                        ? 'text-green-400'
                        : posChange < 0
                        ? 'text-red-400'
                        : 'text-gray-500'
                    }`}
                    title={`Started P${driver.gridPos || index + 1}`}
                  >
                    {posChange > 0 ? `▲${posChange}` : posChange < 0 ? `▼${Math.abs(posChange)}` : '—'}
                  </span>
                </div>

                {/* ── Right Section: Interval, Pit Count, Tyre Compound & Age ── */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* DRS Badge */}
                  {driver.drsOpen && !driver.inPit && (
                    <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold">
                      DRS
                    </span>
                  )}

                  {/* Interval / Gap Display */}
                  <div className="w-14 text-right">
                    {driver.inPit ? (
                      <span className="inline-block px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold animate-pulse">
                        {driver.pitState === 'IN_BOX' ? 'BOX' : 'PIT'}
                      </span>
                    ) : (
                      <span
                        className="font-bold tabular-nums text-[11px]"
                        style={{ color: isLeader ? '#FFD700' : '#E0E0E0' }}
                      >
                        {gapDisplay}
                      </span>
                    )}
                  </div>

                  {/* Pit Stops Pill Badge [ 1 ] */}
                  <span
                    className="px-1.5 py-0.2 rounded bg-black/60 border border-white/10 text-[9px] text-gray-300 font-bold"
                    title={`${pitCount} Pit Stop(s)`}
                  >
                    {pitCount}
                  </span>

                  {/* Tyre Compound Badge + Tyre Age in Laps (MultiViewer Style) */}
                  <div className="flex items-center gap-1">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-white/20"
                      style={{ backgroundColor: tireData.bg, color: tireData.text }}
                      title={`${tire} Compound`}
                    >
                      {tireData.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold tabular-nums w-4 text-right">
                      {tireAge}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

        {/* ── Retired / DNF Drivers Section ── */}
        {sortedDrivers.some((d) => d.isRetired) && (
          <div>
            <div className="px-3 py-1.5 bg-black/80 text-[9px] font-mono font-black tracking-widest text-red-500 uppercase border-t border-b border-red-500/20 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>OUT / RETIRED</span>
              <span className="text-gray-500">
                ({sortedDrivers.filter((d) => d.isRetired).length})
              </span>
            </div>

            {sortedDrivers
              .filter((d) => d.isRetired)
              .map((driver) => {
                const teamCode = getTeamCode(driver.team, driver);
                const reason = driver.retireReason || 'Retired';
                const retireText = driver.completedLaps === 0 ? 'DNS' : `OUT LAP ${driver.completedLaps || driver.retireLap || currentLap}`;

                return (
                  <div
                    key={driver.id}
                    className="px-3 py-2 flex items-center justify-between opacity-50 bg-black/30 text-xs font-mono relative border-b border-white/5"
                  >
                    {/* Left Stripe */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: driver.color }}
                    />

                    {/* Left: OUT badge + Driver */}
                    <div className="flex items-center gap-2 pl-1.5 truncate">
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-black uppercase border border-red-500/30">
                        OUT
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        {teamCode}
                      </span>
                      <span className="font-f1heading font-bold text-gray-300">
                        {driver.code}
                      </span>
                    </div>

                    {/* Right: Retirement Details */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-red-400 font-bold uppercase">
                        {retireText}
                      </div>
                      <div className="text-[9px] text-gray-500 capitalize truncate max-w-[120px]">
                        {reason}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTimingTower;
