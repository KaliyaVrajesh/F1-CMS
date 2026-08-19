import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';

const PreRaceCountdownView = ({
  nextRaceData,
  circuitDetails,
  drivers = [],
  onEnterLiveStream = () => {},
  onSelectReplay = () => {},
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 15,
    minutes: 27,
    seconds: 37,
  });

  // Calculate live countdown to actual target race date (Dutch Grand Prix on Aug 23, 2026)
  useEffect(() => {
    const targetDateString = nextRaceData?.date
      ? `${nextRaceData.date}T${nextRaceData.time || '13:00:00Z'}`
      : '2026-08-23T13:00:00Z';

    const targetDate = new Date(targetDateString);

    const updateTimer = () => {
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
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextRaceData]);

  // Helper to dynamically calculate if session is UPCOMING, LIVE NOW, or COMPLETED
  const getSessionStatus = (sessionDateStr, sessionTimeStr) => {
    if (!sessionDateStr) return 'UPCOMING';
    const start = new Date(`${sessionDateStr}T${sessionTimeStr || '12:00:00Z'}`).getTime();
    const now = Date.now();
    const end = start + 3600000 * 2; // ~2 hours duration

    if (now < start) return 'UPCOMING';
    if (now >= start && now <= end) return 'LIVE NOW';
    return 'COMPLETED';
  };

  // Dynamic weekend timetable based on official race data
  const scheduleSessions = useMemo(() => {
    const fp1Date = nextRaceData?.firstPractice?.date || '2026-08-21';
    const fp1Time = nextRaceData?.firstPractice?.time || '10:30:00Z';
    const sqDate  = nextRaceData?.sprintQualifying?.date || '2026-08-21';
    const sqTime  = nextRaceData?.sprintQualifying?.time || '14:30:00Z';
    const sDate   = nextRaceData?.sprint?.date || '2026-08-22';
    const sTime   = nextRaceData?.sprint?.time || '10:00:00Z';
    const qDate   = nextRaceData?.qualifying?.date || '2026-08-22';
    const qTime   = nextRaceData?.qualifying?.time || '14:00:00Z';
    const gpDate  = nextRaceData?.date || '2026-08-23';
    const gpTime  = nextRaceData?.time || '13:00:00Z';

    return [
      {
        session: 'PRACTICE 1',
        date: new Date(fp1Date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: `${fp1Time.substring(0, 5)} UTC`,
        status: getSessionStatus(fp1Date, fp1Time),
      },
      {
        session: 'SPRINT / QUALIFYING',
        date: new Date(sqDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: `${sqTime.substring(0, 5)} UTC`,
        status: getSessionStatus(sqDate, sqTime),
      },
      {
        session: 'SPRINT RACE',
        date: new Date(sDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: `${sTime.substring(0, 5)} UTC`,
        status: getSessionStatus(sDate, sTime),
      },
      {
        session: 'QUALIFYING',
        date: new Date(qDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: `${qTime.substring(0, 5)} UTC`,
        status: getSessionStatus(qDate, qTime),
      },
      {
        session: 'GRAND PRIX',
        date: new Date(gpDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: `${gpTime.substring(0, 5)} UTC LIGHTS OUT`,
        status: getSessionStatus(gpDate, gpTime),
      },
    ];
  }, [nextRaceData]);

  // Check if qualifying is done
  const qualifyingDateStr = nextRaceData?.qualifying?.date || '2026-08-22';
  const isQualifyingDone = Date.now() > new Date(qualifyingDateStr).getTime() + 7200000;

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
            <span className="text-3xl sm:text-4xl">{circuitDetails?.flag || '🇳🇱'}</span>
            <h1 className="text-3xl sm:text-5xl font-f1heading font-black text-white uppercase tracking-wider mt-2">
              {nextRaceData?.name || circuitDetails?.name || 'Dutch Grand Prix'}
            </h1>
            <p className="text-sm font-mono text-gray-400 mt-1 uppercase">
              {circuitDetails?.country} · {circuitDetails?.name} · {circuitDetails?.lapDistanceKm} KM · {circuitDetails?.totalLaps} LAPS
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

          {/* ── Action Buttons ── */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                playPaddleShift(1.1);
                onEnterLiveStream();
              }}
              className="px-6 py-3 rounded-2xl bg-f1red hover:bg-red-700 text-white font-f1heading font-black text-sm uppercase tracking-wider shadow-lg shadow-red-900/30 transition-all flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>Launch Live 2D Track Telemetry</span>
            </button>

            <button
              onClick={() => {
                playPaddleShift(1.0);
                onSelectReplay();
              }}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              📼 Watch Past GP Replays
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Weekend Schedule & Official Entry List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Weekend Timetable & Weather Forecast */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekend Timetable */}
          <div className="p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                OFFICIAL WEEKEND SCHEDULE
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono divide-y divide-white/5">
              {scheduleSessions.map((s, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{s.session}</div>
                    <div className="text-gray-500 text-[10px]">{s.date} · {s.time}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'LIVE NOW'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40 animate-pulse'
                        : s.status === 'UPCOMING'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
                <div className="text-xl font-f1heading font-black text-white">22°C</div>
                <div className="text-[9px] font-mono text-gray-500">COASTAL BREEZE</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase">TRACK TEMP</div>
                <div className="text-xl font-f1heading font-black text-amber-400">29°C</div>
                <div className="text-[9px] font-mono text-gray-500">DRY ASPHALT</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-mono text-gray-400 uppercase">RAIN RISK</div>
                <div className="text-xl font-f1heading font-black text-green-400">10%</div>
                <div className="text-[9px] font-mono text-gray-500">LOW CHANCE</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Official Drivers Entry List */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏎️</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                {isQualifyingDone ? 'OFFICIAL STARTING GRID LINEUP' : '2026 DRIVERS CHAMPIONSHIP ENTRY LIST'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
              {isQualifyingDone ? 'GRID LOCKED' : 'AWAITING QUALIFYING (SAT, AUG 22)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {drivers.map((driver, idx) => (
              <div
                key={driver.id}
                className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between relative overflow-hidden"
                style={{ borderLeftColor: driver.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-center text-xs font-mono font-black shrink-0 text-gray-400">
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreRaceCountdownView;
