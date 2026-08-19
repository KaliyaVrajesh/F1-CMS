import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';

const PreRaceCountdownView = ({
  nextRaceData,
  circuitDetails,
  drivers = [],
  onEnterPreGrid = () => {},
  onEnterLiveStream = () => {},
  onSelectReplay = () => {},
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 14,
    minutes: 28,
    seconds: 45,
  });

  // Calculate live countdown to race date or mock target
  useEffect(() => {
    const targetDate = nextRaceData?.date
      ? new Date(`${nextRaceData.date}T${nextRaceData.time || '14:00:00Z'}`)
      : new Date(Date.now() + (3 * 86400000 + 14 * 3600000 + 28 * 60000));

    const interval = setInterval(() => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRaceData]);

  return (
    <div className="w-full space-y-8">
      {/* ── Hero Countdown Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-3xl bg-gradient-to-br from-[#0c0e14] via-[#121622] to-[#0a0c10] border border-white/10 shadow-2xl relative overflow-hidden text-center"
      >
        {/* Background glow lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#E10600_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>OFFICIAL F1 PRE-RACE GATE · WAITING ROOM</span>
          </div>

          <div>
            <span className="text-3xl sm:text-4xl">{circuitDetails?.flag || '🏁'}</span>
            <h1 className="text-3xl sm:text-5xl font-f1heading font-black text-white uppercase tracking-wider mt-2">
              {nextRaceData?.name || circuitDetails?.name || 'Upcoming Grand Prix'}
            </h1>
            <p className="text-sm font-mono text-gray-400 mt-1 uppercase">
              {circuitDetails?.country} · {circuitDetails?.lapDistanceKm} KM · {circuitDetails?.totalLaps} LAPS
            </p>
          </div>

          {/* ── Countdown Ticker Box ── */}
          <div className="grid grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
            {[
              { val: timeLeft.days, label: 'DAYS' },
              { val: timeLeft.hours, label: 'HOURS' },
              { val: timeLeft.minutes, label: 'MINUTES' },
              { val: timeLeft.seconds, label: 'SECONDS' },
            ].map((unit, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-lg flex flex-col items-center justify-center"
              >
                <div className="text-3xl sm:text-5xl font-f1heading font-black text-f1red tabular-nums">
                  {String(unit.val).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-widest mt-1">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Live Action Buttons ── */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                playPaddleShift(1.1);
                onEnterLiveStream();
              }}
              className="px-6 py-3 rounded-2xl bg-f1red hover:bg-red-700 text-white font-f1heading font-black text-sm uppercase tracking-wider shadow-lg shadow-red-900/30 transition-all flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>Launch Live 2D Stream</span>
            </button>

            <button
              onClick={() => {
                playPaddleShift(1.0);
                onEnterPreGrid();
              }}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-f1heading font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2"
            >
              <span>🟡 30-Min Pre-Grid Lineup</span>
            </button>

            <button
              onClick={() => {
                playPaddleShift(1.0);
                onSelectReplay();
              }}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              📼 Watch GP Race Replays
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Weekend Schedule & Starting Grid Lineup ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Weekend Timetable & Weather Forecast */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekend Timetable */}
          <div className="p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                GRAND PRIX SCHEDULE (LOCAL TIME)
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono divide-y divide-white/5">
              {[
                { session: 'PRACTICE 1', date: 'Friday', time: '14:30 - 15:30', status: 'COMPLETED' },
                { session: 'PRACTICE 2', date: 'Friday', time: '18:00 - 19:00', status: 'COMPLETED' },
                { session: 'PRACTICE 3', date: 'Saturday', time: '15:00 - 16:00', status: 'COMPLETED' },
                { session: 'QUALIFYING', date: 'Saturday', time: '18:00 - 19:00', status: 'COMPLETED' },
                { session: 'GRAND PRIX', date: 'Sunday', time: '17:00 LIGHTS OUT', status: 'UPCOMING' },
              ].map((s, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{s.session}</div>
                    <div className="text-gray-500 text-[10px]">{s.date} · {s.time}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'UPCOMING'
                        ? 'bg-f1red/20 text-f1red border border-f1red/40 animate-pulse'
                        : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Track Weather Forecast */}
          <div className="p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌤️</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                TRACK TELEMETRY FORECAST
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase">AIR TEMP</div>
                <div className="text-xl font-f1heading font-black text-white">28°C</div>
                <div className="text-[9px] font-mono text-gray-500">SUNNY</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase">TRACK TEMP</div>
                <div className="text-xl font-f1heading font-black text-amber-400">38°C</div>
                <div className="text-[9px] font-mono text-gray-500">DRY ASPHALT</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase">RAIN RISK</div>
                <div className="text-xl font-f1heading font-black text-green-400">0%</div>
                <div className="text-[9px] font-mono text-gray-500">CLEAR SKY</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Official Starting Grid Lineup (P1 to P20) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏁</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                OFFICIAL STARTING GRID LINEUP
              </h3>
            </div>
            <span className="text-xs font-mono text-gray-400">POLE TO P20</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {drivers.map((driver, idx) => {
              const isPole = idx === 0;
              return (
                <div
                  key={driver.id}
                  className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between relative overflow-hidden"
                  style={{ borderLeftColor: driver.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-5 text-center text-xs font-mono font-black shrink-0"
                      style={{ color: isPole ? '#FFD700' : '#FFFFFF' }}
                    >
                      {idx + 1}
                    </span>

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

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-f1heading font-black text-white truncate">
                          {driver.name}
                        </span>
                        {isPole && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold">
                            POLE
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[9px] font-mono uppercase font-bold truncate"
                        style={{ color: driver.color }}
                      >
                        {driver.team}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-gray-400 shrink-0">
                    #{driver.number}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreRaceCountdownView;
