import { motion, AnimatePresence } from 'framer-motion';

const LiveRaceHUD = ({
  circuitDetails,
  flagStatus = 'GREEN',
  currentLap = 1,
  totalLaps = 57,
  selectedDriver = null,
  onDeselectDriver = () => {},
}) => {
  // Speed, Gear, and RPM computation for focused driver
  const speed = selectedDriver?.speed ? Math.round(selectedDriver.speed) : 285;
  const gear = speed > 290 ? 8 : speed > 250 ? 7 : speed > 210 ? 6 : speed > 170 ? 5 : speed > 130 ? 4 : speed > 90 ? 3 : 2;
  const rpm = Math.min(12500, Math.round(7000 + (speed / 330) * 5500));
  const throttle = Math.min(100, Math.round((speed / 320) * 100));
  const brake = speed < 140 ? Math.round((1 - speed / 140) * 100) : 0;
  const isDrs = selectedDriver?.drsOpen || false;

  return (
    <div className="w-full space-y-4">
      {/* ── Top Race Control Bar ── */}
      <div className="w-full p-4 rounded-2xl bg-[#090b10] border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Left: Circuit Info & Flag */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{circuitDetails?.flag || '🏁'}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase">
                {circuitDetails?.country}
              </span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs font-mono text-gray-400">
                {circuitDetails?.lapDistanceKm} KM
              </span>
            </div>
            <h2 className="text-base font-f1heading font-black text-white uppercase tracking-wider">
              {circuitDetails?.name}
            </h2>
          </div>
        </div>

        {/* Middle: Live Lap & Flag Status */}
        <div className="flex items-center gap-3">
          {/* Lap Counter */}
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-[10px] font-mono text-gray-400 tracking-wider uppercase">LAP</div>
            <div className="text-sm font-f1heading font-black text-white">
              {currentLap} <span className="text-xs text-gray-500">/ {totalLaps}</span>
            </div>
          </div>

          {/* Flag Status */}
          <div
            className="px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-black text-xs uppercase tracking-wider"
            style={{
              backgroundColor:
                flagStatus === 'GREEN'
                  ? 'rgba(0, 230, 118, 0.15)'
                  : flagStatus === 'SC'
                  ? 'rgba(255, 170, 0, 0.2)'
                  : flagStatus === 'RED'
                  ? 'rgba(225, 6, 0, 0.25)'
                  : 'rgba(255, 215, 0, 0.2)',
              borderColor:
                flagStatus === 'GREEN'
                  ? '#00e676'
                  : flagStatus === 'SC'
                  ? '#FFAA00'
                  : flagStatus === 'RED'
                  ? '#E10600'
                  : '#FFD700',
              color:
                flagStatus === 'GREEN'
                  ? '#00e676'
                  : flagStatus === 'SC'
                  ? '#FFD066'
                  : flagStatus === 'RED'
                  ? '#FF6B6B'
                  : '#FFE066',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{flagStatus} FLAG</span>
          </div>
        </div>

        {/* Right: Weather Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono text-gray-300">
          <div className="flex items-center gap-1.5">
            <span>🌡️</span>
            <span>AIR 26°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🛣️</span>
            <span>TRACK 34°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💧</span>
            <span>RAIN 0%</span>
          </div>
        </div>
      </div>

      {/* ── Focused Driver Cockpit Telemetry HUD ── */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full p-5 rounded-3xl bg-[#090b10] border border-white/15 shadow-2xl relative overflow-hidden"
            style={{ borderLeftColor: selectedDriver.color, borderLeftWidth: '5px' }}
          >
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden border bg-black/50 flex items-center justify-center shrink-0"
                  style={{ borderColor: selectedDriver.color }}
                >
                  {selectedDriver.photo ? (
                    <img
                      src={selectedDriver.photo}
                      alt={selectedDriver.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-sm font-black" style={{ color: selectedDriver.color }}>
                      {selectedDriver.code}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-f1heading font-black text-white">
                      {selectedDriver.name}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono text-gray-300 font-bold">
                      #{selectedDriver.number}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold uppercase" style={{ color: selectedDriver.color }}>
                    {selectedDriver.team} · COCKPIT TELEMETRY
                  </p>
                </div>
              </div>

              <button
                onClick={onDeselectDriver}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white text-xs transition-all"
                title="Exit Focus Mode"
              >
                ✕
              </button>
            </div>

            {/* Shift Lights Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1">
                <span>RPM: {rpm.toLocaleString()}</span>
                <span>REV LIMIT 12,500</span>
              </div>
              <div className="flex items-center gap-1.5 h-3 bg-black/60 p-1 rounded-lg border border-white/10">
                {Array.from({ length: 15 }, (_, i) => {
                  const threshold = 7000 + (i / 15) * 5500;
                  const isLit = rpm >= threshold;
                  let color = '#00E676';
                  if (i >= 5) color = '#FFD700';
                  if (i >= 10) color = '#E10600';
                  if (i >= 13) color = '#D500F9';

                  return (
                    <div
                      key={i}
                      className="flex-1 h-full rounded-sm transition-all duration-75"
                      style={{
                        backgroundColor: isLit ? color : 'rgba(255, 255, 255, 0.05)',
                        boxShadow: isLit ? `0 0 6px ${color}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Gauges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {/* Speed */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  SPEED
                </div>
                <div className="text-3xl font-f1heading font-black text-white tabular-nums">
                  {speed}
                </div>
                <div className="text-[9px] font-mono text-gray-500 uppercase">KM/H</div>
              </div>

              {/* Gear */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  GEAR
                </div>
                <div className="text-3xl font-f1heading font-black text-amber-400 tabular-nums">
                  {gear}
                </div>
                <div className="text-[9px] font-mono text-gray-500 uppercase">TRANSMISSION</div>
              </div>

              {/* Throttle / Brake Bars */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  PEDALS
                </div>
                <div className="space-y-1.5 my-auto">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono">
                    <span className="w-5 text-left text-green-400">THR</span>
                    <div className="flex-1 h-2 rounded bg-black/60 overflow-hidden border border-white/10">
                      <div className="h-full bg-green-500 rounded" style={{ width: `${throttle}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono">
                    <span className="w-5 text-left text-red-400">BRK</span>
                    <div className="flex-1 h-2 rounded bg-black/60 overflow-hidden border border-white/10">
                      <div className="h-full bg-red-500 rounded" style={{ width: `${brake}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* DRS Status */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                  DRS FLAP
                </div>
                <div
                  className="text-2xl font-f1heading font-black tracking-wider uppercase mt-1"
                  style={{ color: isDrs ? '#00e676' : '#666666' }}
                >
                  {isDrs ? 'OPEN' : 'CLOSED'}
                </div>
                <div className="text-[9px] font-mono text-gray-500 uppercase">
                  {isDrs ? 'DRAG REDUCTION' : 'STANDBY'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveRaceHUD;
