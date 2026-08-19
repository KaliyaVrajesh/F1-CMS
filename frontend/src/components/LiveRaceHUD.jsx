import { motion, AnimatePresence } from 'framer-motion';
import { getTeamName, getTeamCode } from '../utils/teamColors';

const LiveRaceHUD = ({
  circuitDetails,
  flagStatus = 'GREEN',
  currentLap = 1,
  totalLaps = 57,
  selectedDriver = null,
  leaderDriver = null,
  onDeselectDriver = () => {},
}) => {
  // Primary / Selected driver telemetry
  const driver1 = leaderDriver || selectedDriver;
  const driver2 = selectedDriver && selectedDriver.id !== driver1?.id ? selectedDriver : null;

  const getDriverTelemetry = (d) => {
    if (!d) return null;
    const isPit = d.inPit || false;
    const isStationaryBox = d.pitState === 'IN_BOX';
    const speed = d.speed !== undefined ? Math.round(d.speed) : 285;
    const gear = isStationaryBox ? 1 : speed > 290 ? 8 : speed > 250 ? 7 : speed > 210 ? 6 : speed > 170 ? 5 : speed > 130 ? 4 : speed > 90 ? 3 : 2;
    const rpm = isStationaryBox ? 4500 : Math.min(12500, Math.round(7000 + (speed / 330) * 5500));
    const throttle = isStationaryBox ? 0 : Math.min(100, Math.round((speed / 320) * 100));
    const brake = isStationaryBox ? 100 : speed < 140 ? Math.round((1 - speed / 140) * 100) : 0;
    const isDrs = d.drsOpen && !isPit;
    const teamCode = getTeamCode(d.team, d);
    const teamDisplayName = getTeamName(d.team, d) || (typeof d.team === 'string' ? d.team : 'F1 Team');

    return { isPit, isStationaryBox, speed, gear, rpm, throttle, brake, isDrs, teamCode, teamDisplayName };
  };

  const t1 = getDriverTelemetry(driver1);
  const t2 = getDriverTelemetry(driver2);

  return (
    <div className="w-full space-y-3">
      {/* ── Top Race Control Bar (Broadcast Style) ── */}
      <div className="w-full px-5 py-3.5 rounded-2xl bg-[#090b10] border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
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
            <h2 className="text-sm font-f1heading font-black text-white uppercase tracking-wider">
              {circuitDetails?.name}
            </h2>
          </div>
        </div>

        {/* Middle: Live Lap & Flag Status */}
        <div className="flex items-center gap-3">
          {/* Lap Counter */}
          <div className="px-3.5 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-[9px] font-mono text-gray-400 tracking-wider uppercase">LAP</div>
            <div className="text-xs font-f1heading font-black text-white">
              {currentLap} <span className="text-xs text-gray-500">/ {totalLaps}</span>
            </div>
          </div>

          {/* Flag Status */}
          <div
            className="px-3 py-1 rounded-xl border flex items-center gap-2 font-mono font-black text-xs uppercase tracking-wider"
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
          <div className="flex items-center gap-1">
            <span>🌡️</span>
            <span>26°C AIR</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🛣️</span>
            <span>34°C TRACK</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span>0% RAIN</span>
          </div>
        </div>
      </div>

      {/* ── MultiViewer Style Live Telemetry Strip (Matching Image 2) ── */}
      {t1 && (
        <div className="p-3 rounded-2xl bg-[#090b10] border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shadow-xl">
          {/* Driver 1 Telemetry (Leader) */}
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: driver1.color }} />
              <span className="font-bold text-gray-400">{t1.teamCode}</span>
              <span className="font-f1heading font-black text-white text-sm">{driver1.code}</span>
            </div>

            <div className="flex items-center gap-1 text-gray-300">
              <span className="text-gray-500 text-[10px]">SPD</span>
              <span className="text-white font-bold tabular-nums w-12">{t1.speed} km/h</span>
            </div>

            {/* Throttle Bar */}
            <div className="flex items-center gap-1">
              <span className="text-green-400 text-[10px] font-bold">THR</span>
              <div className="w-12 h-2 bg-black/60 rounded overflow-hidden border border-white/10">
                <div className="h-full bg-green-500 rounded" style={{ width: `${t1.throttle}%` }} />
              </div>
            </div>

            {/* Brake Bar */}
            <div className="flex items-center gap-1">
              <span className="text-red-400 text-[10px] font-bold">BRK</span>
              <div className="w-10 h-2 bg-black/60 rounded overflow-hidden border border-white/10">
                <div className="h-full bg-red-500 rounded" style={{ width: `${t1.brake}%` }} />
              </div>
            </div>

            <div className="text-[11px] text-amber-400 font-bold">
              G{t1.gear} · {(t1.rpm / 1000).toFixed(1)}k
            </div>

            {t1.isDrs && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                DRS ON
              </span>
            )}
            {t1.isPit && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold animate-pulse">
                {t1.isStationaryBox ? 'BOX 2.4s' : 'PIT 80'}
              </span>
            )}
          </div>

          {/* Driver 2 Telemetry (Selected Driver Comparison) */}
          {driver2 && t2 && (
            <div className="flex items-center gap-4 flex-1 min-w-[280px] border-t sm:border-t-0 sm:border-l border-white/10 pt-2 sm:pt-0 sm:pl-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: driver2.color }} />
                <span className="font-bold text-gray-400">{t2.teamCode}</span>
                <span className="font-f1heading font-black text-white text-sm">{driver2.code}</span>
              </div>

              <div className="flex items-center gap-1 text-gray-300">
                <span className="text-gray-500 text-[10px]">SPD</span>
                <span className="text-white font-bold tabular-nums w-12">{t2.speed} km/h</span>
              </div>

              {/* Throttle Bar */}
              <div className="flex items-center gap-1">
                <span className="text-green-400 text-[10px] font-bold">THR</span>
                <div className="w-12 h-2 bg-black/60 rounded overflow-hidden border border-white/10">
                  <div className="h-full bg-green-500 rounded" style={{ width: `${t2.throttle}%` }} />
                </div>
              </div>

              {/* Brake Bar */}
              <div className="flex items-center gap-1">
                <span className="text-red-400 text-[10px] font-bold">BRK</span>
                <div className="w-10 h-2 bg-black/60 rounded overflow-hidden border border-white/10">
                  <div className="h-full bg-red-500 rounded" style={{ width: `${t2.brake}%` }} />
                </div>
              </div>

              <div className="text-[11px] text-amber-400 font-bold">
                G{t2.gear} · {(t2.rpm / 1000).toFixed(1)}k
              </div>

              {t2.isDrs && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                  DRS ON
                </span>
              )}
              {t2.isPit && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold animate-pulse">
                  {t2.isStationaryBox ? 'BOX 2.4s' : 'PIT 80'}
                </span>
              )}

              <button
                onClick={onDeselectDriver}
                className="text-gray-500 hover:text-white text-xs ml-auto"
                title="Deselect driver"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveRaceHUD;
