import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getTeamName } from '../utils/teamColors';
import RacePrediction from './RacePrediction';

// ── Timezone utilities ────────────────────────────────────────────────────────

/**
 * Given a date string ("2026-08-23") and time string ("13:00:00Z"),
 * return a Date object for that moment.
 */
const toDate = (dateStr, timeStr = '12:00:00Z') =>
  new Date(`${dateStr}T${timeStr}`);

/**
 * Format a Date in a specific IANA timezone, e.g. "Europe/Amsterdam".
 * Falls back gracefully if timezone is unknown.
 */
const formatInTZ = (date, tz) => {
  try {
    return date.toLocaleTimeString('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return date.toUTCString().slice(17, 22); // fallback: UTC
  }
};

const formatDateInTZ = (date, tz) => {
  try {
    return date.toLocaleDateString('en-GB', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date.toDateString();
  }
};

/**
 * Map circuitId / country to IANA timezone.
 * Covers all current F1 venues.
 */
const CIRCUIT_TIMEZONES = {
  albert_park:   'Australia/Melbourne',
  shanghai:      'Asia/Shanghai',
  suzuka:        'Asia/Tokyo',
  bahrain:       'Asia/Bahrain',
  jeddah:        'Asia/Riyadh',
  miami:         'America/New_York',
  imola:         'Europe/Rome',
  monaco:        'Europe/Monaco',
  villeneuve:    'America/Toronto',
  catalunya:     'Europe/Madrid',
  red_bull_ring: 'Europe/Vienna',
  silverstone:   'Europe/London',
  hungaroring:   'Europe/Budapest',
  spa:           'Europe/Brussels',
  zandvoort:     'Europe/Amsterdam',
  monza:         'Europe/Rome',
  baku:          'Asia/Baku',
  marina_bay:    'Asia/Singapore',
  americas:      'America/Chicago',
  rodriguez:     'America/Mexico_City',
  interlagos:    'America/Sao_Paulo',
  vegas:         'America/Los_Angeles',
  losail:        'Asia/Qatar',
  yas_marina:    'Asia/Dubai',
  madring:       'Europe/Madrid',
  sepang:        'Asia/Kuala_Lumpur',
};

const getCircuitTZ = (circuitId) =>
  CIRCUIT_TIMEZONES[circuitId?.toLowerCase()] || 'UTC';

// ── Session status ────────────────────────────────────────────────────────────

const getSessionStatus = (sessionDateStr, sessionTimeStr) => {
  if (!sessionDateStr) return 'UPCOMING';
  const start = toDate(sessionDateStr, sessionTimeStr).getTime();
  const now   = Date.now();
  const end   = start + 3_600_000 * 2; // ~2 h duration
  if (now < start)             return 'UPCOMING';
  if (now >= start && now <= end) return 'LIVE NOW';
  return 'COMPLETED';
};

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const styles = {
    'LIVE NOW': 'bg-green-500/20 text-green-400 border-green-500/40 animate-pulse',
    'UPCOMING': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'COMPLETED':'bg-white/5 text-gray-500 border-white/10',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status] || styles.UPCOMING}`}>
      {status}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const PreRaceCountdownView = ({
  nextRaceData,
  circuitDetails,
  drivers = [],
}) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  // 'track' | 'local'
  const [timeMode, setTimeMode] = useState('track');

  // Live countdown
  useEffect(() => {
    const target = toDate(
      nextRaceData?.date  || '2026-08-23',
      nextRaceData?.time  || '13:00:00Z',
    );

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000)  / 60_000),
        seconds: Math.floor((diff % 60_000)     / 1_000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRaceData]);

  // Resolve circuit timezone
  const circuitId = nextRaceData?.circuitId || '';
  const trackTZ   = getCircuitTZ(circuitId);
  const localTZ   = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Build the session rows — only show sprint sessions if they actually exist
  const scheduleSessions = useMemo(() => {
    const nd = nextRaceData || {};

    const rows = [];

    // Practice 1
    if (nd.firstPractice?.date || nd.firstPractice) {
      const d = nd.firstPractice?.date || nd.firstPractice;
      const t = nd.firstPractice?.time || '12:00:00Z';
      rows.push({ session: 'PRACTICE 1', dateStr: d, timeStr: t });
    }

    // Practice 2 (non-sprint weekends only)
    if (nd.secondPractice?.date) {
      rows.push({ session: 'PRACTICE 2', dateStr: nd.secondPractice.date, timeStr: nd.secondPractice.time || '16:00:00Z' });
    }

    // Practice 3 (non-sprint weekends only)
    if (nd.thirdPractice?.date) {
      rows.push({ session: 'PRACTICE 3', dateStr: nd.thirdPractice.date, timeStr: nd.thirdPractice.time || '12:00:00Z' });
    }

    // Sprint Qualifying (only if sprint weekend)
    if (nd.sprintQualifying?.date) {
      rows.push({ session: 'SPRINT QUALIFYING', dateStr: nd.sprintQualifying.date, timeStr: nd.sprintQualifying.time || '14:30:00Z' });
    }

    // Sprint Race (only if sprint weekend)
    if (nd.sprint?.date) {
      rows.push({ session: 'SPRINT RACE', dateStr: nd.sprint.date, timeStr: nd.sprint.time || '10:00:00Z' });
    }

    // Qualifying
    if (nd.qualifying?.date) {
      rows.push({ session: 'QUALIFYING', dateStr: nd.qualifying.date, timeStr: nd.qualifying.time || '14:00:00Z' });
    }

    // Grand Prix (always present)
    rows.push({ session: 'GRAND PRIX', dateStr: nd.date || '2026-08-23', timeStr: nd.time || '13:00:00Z', isRace: true });

    // Sort by datetime
    rows.sort((a, b) => toDate(a.dateStr, a.timeStr) - toDate(b.dateStr, b.timeStr));

    return rows.map(row => {
      const date = toDate(row.dateStr, row.timeStr);
      const displayTZ = timeMode === 'track' ? trackTZ : localTZ;
      return {
        ...row,
        displayDate: formatDateInTZ(date, displayTZ),
        displayTime: `${formatInTZ(date, displayTZ)} ${timeMode === 'track' ? getTZAbbr(trackTZ) : 'Local'}`,
        status: getSessionStatus(row.dateStr, row.timeStr),
      };
    });
  }, [nextRaceData, timeMode, trackTZ, localTZ]);

  // Is qualifying done?
  const qualDone = nextRaceData?.qualifying?.date
    ? Date.now() > toDate(nextRaceData.qualifying.date, nextRaceData.qualifying.time || '14:00:00Z').getTime() + 7_200_000
    : false;

  return (
    <div className="w-full space-y-8">

      {/* ── Hero Countdown Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-3xl bg-gradient-to-br from-[#0c0e14] via-[#121622] to-[#0a0c10] border border-white/10 shadow-2xl relative overflow-hidden text-center"
      >
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#E10600_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div>
            <span className="text-3xl sm:text-4xl">{circuitDetails?.flag || '🏁'}</span>
            <h1 className="text-3xl sm:text-5xl font-f1heading font-black text-white uppercase tracking-wider mt-2">
              {nextRaceData?.name || circuitDetails?.name || 'Next Grand Prix'}
            </h1>
            <p className="text-sm font-mono text-gray-400 mt-1 uppercase">
              {circuitDetails?.country || nextRaceData?.country} · {circuitDetails?.name || nextRaceData?.circuitName} · {circuitDetails?.lapDistanceKm} KM · {circuitDetails?.totalLaps} LAPS
            </p>
          </div>

          {/* Countdown */}
          <div className="grid grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
            {[
              { val: timeLeft.days,    label: 'DAYS'    },
              { val: timeLeft.hours,   label: 'HOURS'   },
              { val: timeLeft.minutes, label: 'MINUTES' },
              { val: timeLeft.seconds, label: 'SECONDS' },
            ].map((unit, idx) => (
              <div key={idx}
                className="p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-lg flex flex-col items-center justify-center">
                <div className="text-3xl sm:text-5xl font-f1heading font-black text-f1red tabular-nums">
                  {String(unit.val).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-widest mt-1">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Weekend Schedule & Driver List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left: Schedule */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">

            {/* Header + timezone toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                  OFFICIAL WEEKEND SCHEDULE
                </h3>
              </div>

              {/* Track / Local toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                <button
                  onClick={() => setTimeMode('track')}
                  className={`px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    timeMode === 'track'
                      ? 'bg-f1red text-white'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  🏁 Track
                </button>
                <button
                  onClick={() => setTimeMode('local')}
                  className={`px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    timeMode === 'local'
                      ? 'bg-f1red text-white'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  🕐 Local
                </button>
              </div>
            </div>

            {/* Timezone label */}
            <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
              {timeMode === 'track'
                ? `Track timezone: ${trackTZ}`
                : `Your timezone: ${localTZ}`}
            </div>

            {/* Session rows */}
            <div className="space-y-2 text-xs font-mono divide-y divide-white/5">
              {scheduleSessions.map((s, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`font-bold truncate ${s.isRace ? 'text-f1red' : 'text-white'}`}>
                      {s.session}
                    </div>
                    <div className="text-gray-500 text-[10px]">{s.displayDate} · {s.displayTime}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div className="p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌤️</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                TRACK TELEMETRY FORECAST
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'AIR TEMP',   value: '22°C',  sub: 'COASTAL BREEZE', color: 'text-white' },
                { label: 'TRACK TEMP', value: '29°C',  sub: 'DRY ASPHALT',    color: 'text-amber-400' },
                { label: 'RAIN RISK',  value: '10%',   sub: 'LOW CHANCE',     color: 'text-green-400' },
              ].map(w => (
                <div key={w.label} className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">{w.label}</div>
                  <div className={`text-xl font-f1heading font-black ${w.color}`}>{w.value}</div>
                  <div className="text-[9px] font-mono text-gray-500">{w.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Driver entry list */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏎️</span>
              <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
                {qualDone ? 'OFFICIAL STARTING GRID LINEUP' : '2026 DRIVERS CHAMPIONSHIP ENTRY LIST'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
              {qualDone ? 'GRID LOCKED' : 'ENTRY LIST'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {drivers.map((driver, idx) => (
              <div key={driver.id}
                className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between relative overflow-hidden"
                style={{ borderLeftColor: driver.color, borderLeftWidth: '4px' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-center text-xs font-mono font-black shrink-0 text-gray-400">
                    {idx + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border flex items-center justify-center bg-black/40"
                    style={{ borderColor: `${driver.color}60` }}>
                    {driver.photo ? (
                      <img src={driver.photo} alt={driver.name}
                        className="w-full h-full object-cover object-top"
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <span className="text-[9px] font-black" style={{ color: driver.color }}>
                        {driver.code}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-f1heading font-black text-white truncate">{driver.name}</div>
                    <div className="text-[9px] font-mono uppercase font-bold truncate" style={{ color: driver.color }}>
                      {getTeamName(driver.team, driver) || (typeof driver.team === 'string' ? driver.team : 'F1 Team')}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-gray-400 shrink-0">#{driver.number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Timezone abbreviation helper ──────────────────────────────────────────────
function getTZAbbr(tz) {
  try {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(d);
    return parts.find(p => p.type === 'timeZoneName')?.value || tz;
  } catch {
    return tz;
  }
}

export default PreRaceCountdownView;
