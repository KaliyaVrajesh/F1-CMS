import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getF1NextRace } from '../services/api';
import { DEFAULT_DRIVERS, CIRCUIT_DETAILS, getCircuitDetails } from '../utils/circuitTrackData';
import { loadHistoricalGPReplay } from '../services/liveRaceService';
import LiveTrackVisualizer from '../components/LiveTrackVisualizer';
import LiveTimingTower from '../components/LiveTimingTower';
import LiveRaceHUD from '../components/LiveRaceHUD';
import PreRaceCountdownView from '../components/PreRaceCountdownView';
import { playPaddleShift, playStartingBeep } from '../utils/audio';

// Official FIA Formula 1 World Championship Calendar
const OFFICIAL_F1_CALENDAR = [
  { key: 'bahrain',          name: 'Round 1: Bahrain Grand Prix (Sakhir)' },
  { key: 'Jeddah',           name: 'Round 2: Saudi Arabian Grand Prix (Jeddah)' },
  { key: 'AlbertPark',       name: 'Round 3: Australian Grand Prix (Melbourne)' },
  { key: 'Suzuka',           name: 'Round 4: Japanese Grand Prix (Suzuka)' },
  { key: 'Shanghai',         name: 'Round 5: Chinese Grand Prix (Shanghai)' },
  { key: 'Miami',            name: 'Round 6: Miami Grand Prix (Miami)' },
  { key: 'Imola',            name: 'Round 7: Emilia Romagna Grand Prix (Imola)' },
  { key: 'monaco',           name: 'Round 8: Monaco Grand Prix (Monte Carlo)' },
  { key: 'GillesVilleneuve', name: 'Round 9: Canadian Grand Prix (Montreal)' },
  { key: 'Catalunya',        name: 'Round 10: Spanish Grand Prix (Barcelona)' },
  { key: 'austria',          name: 'Round 11: Austrian Grand Prix (Red Bull Ring)' },
  { key: 'silverstone',      name: 'Round 12: British Grand Prix (Silverstone)' },
  { key: 'hungaroring',      name: 'Round 13: Hungarian Grand Prix (Hungaroring)' },
  { key: 'Spa',              name: 'Round 14: Belgian Grand Prix (Spa-Francorchamps)' },
  { key: 'Zandvoort',        name: 'Round 15: Dutch Grand Prix (Zandvoort)' },
  { key: 'monza',            name: 'Round 16: Italian Grand Prix (Monza)' },
  { key: 'baku',             name: 'Round 17: Azerbaijan Grand Prix (Baku)' },
  { key: 'marinabay',        name: 'Round 18: Singapore Grand Prix (Marina Bay)' },
  { key: 'Americas',         name: 'Round 19: United States Grand Prix (Austin - COTA)' },
  { key: 'HermanosRodriguez',name: 'Round 20: Mexico City Grand Prix (Hermanos Rodríguez)' },
  { key: 'Interlagos',       name: 'Round 21: São Paulo Grand Prix (Interlagos)' },
  { key: 'LasVegas',         name: 'Round 22: Las Vegas Grand Prix (Las Vegas Strip)' },
  { key: 'Lusail',           name: 'Round 23: Qatar Grand Prix (Lusail)' },
  { key: 'AbuDhabi',         name: 'Round 24: Abu Dhabi Grand Prix (Yas Marina)' },
];

const HISTORICAL_REPLAYS = [
  { year: 2024, round: 12, name: '2024 British GP (Lewis Hamilton 9th Silverstone Win)', circuitKey: 'silverstone' },
  { year: 2024, round: 24, name: '2024 Abu Dhabi Grand Prix (Season Finale)', circuitKey: 'AbuDhabi' },
  { year: 2024, round: 16, name: '2024 Italian Grand Prix (Ferrari Monza Masterclass)', circuitKey: 'monza' },
  { year: 2024, round: 14, name: '2024 Belgian Grand Prix (Spa High-Speed Battle)', circuitKey: 'Spa' },
  { year: 2024, round: 15, name: '2024 Dutch Grand Prix (Zandvoort Victory)', circuitKey: 'Zandvoort' },
  { year: 2024, round: 8,  name: '2024 Monaco Grand Prix (Charles Leclerc Home Win)', circuitKey: 'monaco' },
  { year: 2023, round: 22, name: '2023 Las Vegas Grand Prix (Night Street Battle)', circuitKey: 'LasVegas' },
];

// Helper to format seconds into mm:ss or hh:mm:ss
const formatTime = (totalSeconds) => {
  const s = Math.floor(totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};const LiveRace = () => {
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [selectedCircuitKey, setSelectedCircuitKey] = useState('Zandvoort');
  const [circuitDetails, setCircuitDetails] = useState(CIRCUIT_DETAILS.Zandvoort);
  const [nextRaceData, setNextRaceData] = useState({
    name: 'Dutch Grand Prix',
    circuitName: 'Circuit Zandvoort',
    circuitId: 'zandvoort',
    country: 'Netherlands',
    date: '2026-08-23',
    time: '13:00:00Z',
    firstPractice: { date: '2026-08-21', time: '10:30:00Z' },
    sprintQualifying: { date: '2026-08-21', time: '14:30:00Z' },
    sprint: { date: '2026-08-22', time: '10:00:00Z' },
    qualifying: { date: '2026-08-22', time: '14:00:00Z' },
  });

  const [drivers, setDrivers] = useState(DEFAULT_DRIVERS);
  const [liveDrivers, setLiveDrivers] = useState(DEFAULT_DRIVERS);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1.0);
  const [flagStatus, setFlagStatus] = useState('GREEN');
  const [currentLap, setCurrentLap] = useState(1);
  const [totalLaps, setTotalLaps] = useState(72);
  const [replayTimeSec, setReplayTimeSec] = useState(0);
  const [selectedReplayIndex, setSelectedReplayIndex] = useState(0);
  const [replayTimeline, setReplayTimeline] = useState([]);
  const [raceEvents, setRaceEvents] = useState([
    { id: 1, text: '🟢 Green Flag! Live session connected to OpenF1 telemetry API.', time: 'Lap 1' },
    { id: 2, text: '📡 Official DRS zones active across circuit straights.', time: 'Lap 2' },
  ]);

  const lastTickTimeRef = useRef(performance.now());
  const lapDurationSec = circuitDetails?.averageLapTimeSec || 88.0;
  const totalRaceDurationSec = totalLaps * lapDurationSec;

  // Load upcoming race metadata from API on mount
  useEffect(() => {
    getF1NextRace()
      .then(({ data }) => {
        if (data?.name || data?.circuitName || data?.circuitId) {
          const circuitKey = data.circuitId || data.circuitName || 'Zandvoort';
          const details = getCircuitDetails(circuitKey);
          setNextRaceData(data);
          setSelectedCircuitKey(details.file);
          setCircuitDetails(details);
          setTotalLaps(details.totalLaps);
        }
      })
      .catch(() => {});
  }, []);

  // Continuous background polling from OpenF1 API when Live Broadcast is active
  useEffect(() => {
    if (!isLiveBroadcasting || isReplayMode) return;

    let isSubscribed = true;

    const pollOpenF1 = async () => {
      const liveData = await fetchOpenF1LiveTelemetry('latest');
      if (isSubscribed && liveData?.drivers && liveData.drivers.length > 0) {
        setDrivers(liveData.drivers);
        setLiveDrivers(liveData.drivers);
      }
    };

    pollOpenF1();
    const intervalId = setInterval(pollOpenF1, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [isLiveBroadcasting, isReplayMode]);

  // Update circuit details when selection changes
  const handleCircuitChange = (key) => {
    playPaddleShift(1.0);
    setSelectedCircuitKey(key);
    const details = getCircuitDetails(key);
    setCircuitDetails(details);
    setTotalLaps(details.totalLaps);
    setCurrentLap(1);
    setReplayTimeSec(0);
    toast.success(`Loaded ${details.name}`);
  };

  // Helper to extract events up to a given lap
  const getEventsUpToLap = (timeline, targetLap) => {
    const events = [];
    timeline.slice(0, targetLap).forEach((lapItem) => {
      lapItem.overtakes?.forEach((o) => {
        events.push({
          id: `${o.lap}-${o.overtaker.code}`,
          text: `🏎️ ${o.overtaker.name} (${o.overtaker.code}) overtook ${o.passed.name} for P${o.newPos}!`,
          time: `Lap ${o.lap}`,
        });
      });
      lapItem.pitStops?.forEach((p) => {
        events.push({
          id: `${lapItem.lap}-pit-${p.code}`,
          text: `🔧 ${p.name} (${p.code}) pitted for new tires (${p.pitDuration || '2.4s'}).`,
          time: `Lap ${lapItem.lap}`,
        });
      });
    });
    return events.reverse().slice(0, 15);
  };

  // Continuous playback loop for replay mode
  useEffect(() => {
    if (!isLiveBroadcasting || !isReplayMode) return;

    let animId;
    const playTick = (now) => {
      const dt = Math.min((now - lastTickTimeRef.current) / 1000, 0.1);
      lastTickTimeRef.current = now;

      if (isPlaying && flagStatus !== 'RED') {
        setReplayTimeSec((prevTime) => {
          const nextTime = prevTime + dt * simulationSpeed;
          if (nextTime >= totalRaceDurationSec) {
            setIsPlaying(false);
            return totalRaceDurationSec;
          }

          const calculatedLap = Math.min(totalLaps, Math.floor(nextTime / lapDurationSec) + 1);
          if (calculatedLap !== currentLap) {
            setCurrentLap(calculatedLap);
            if (replayTimeline[calculatedLap - 1]) {
              const updatedEvents = getEventsUpToLap(replayTimeline, calculatedLap);
              if (updatedEvents.length > 0) setRaceEvents(updatedEvents);
            }
          }
          return nextTime;
        });
      }

      animId = requestAnimationFrame(playTick);
    };

    lastTickTimeRef.current = performance.now();
    animId = requestAnimationFrame(playTick);
    return () => cancelAnimationFrame(animId);
  }, [isLiveBroadcasting, isReplayMode, isPlaying, simulationSpeed, flagStatus, lapDurationSec, totalLaps, totalRaceDurationSec, currentLap, replayTimeline]);

  // Load selected historical GP replay data
  const handleSelectReplay = async (idx) => {
    playPaddleShift(1.1);
    setSelectedReplayIndex(idx);
    const replayInfo = HISTORICAL_REPLAYS[idx];
    toast.loading(`Fetching official session replay for ${replayInfo.name}...`, { id: 'replay-load' });

    const replayData = await loadHistoricalGPReplay(replayInfo.year, replayInfo.round);
    toast.dismiss('replay-load');

    if (replayData.success && replayData.lapsTimeline.length > 0) {
      setDrivers(replayData.drivers);
      setLiveDrivers(replayData.drivers);
      setTotalLaps(replayData.totalLaps);
      setReplayTimeline(replayData.lapsTimeline);
      setCurrentLap(1);
      setReplayTimeSec(0);

      const details = getCircuitDetails(replayInfo.circuitKey);
      setSelectedCircuitKey(details.file);
      setCircuitDetails(details);

      const initialEvents = getEventsUpToLap(replayData.lapsTimeline, 1);
      if (initialEvents.length > 0) {
        setRaceEvents(initialEvents);
      }

      setIsReplayMode(true);
      setIsLiveBroadcasting(true);
      toast.success(`Official replay loaded: ${replayInfo.name}`);
    } else {
      toast.error('Failed to load replay data.');
    }
  };

  // Video-player style seeking / scrubbing
  const handleSeekReplayTime = (seekSec) => {
    const time = Math.max(0, Math.min(totalRaceDurationSec, parseFloat(seekSec)));
    setReplayTimeSec(time);
    const lap = Math.min(totalLaps, Math.floor(time / lapDurationSec) + 1);
    setCurrentLap(lap);

    if (replayTimeline[lap - 1]) {
      const lapPositions = replayTimeline[lap - 1].positions;
      setDrivers(lapPositions);
      setLiveDrivers(lapPositions);

      const updatedEvents = getEventsUpToLap(replayTimeline, lap);
      if (updatedEvents.length > 0) {
        setRaceEvents(updatedEvents);
      }
    }
  };

  const handleTogglePlay = () => {
    playPaddleShift(1.1);
    setIsPlaying((prev) => !prev);
  };

  const handleSpeedChange = (speed) => {
    playPaddleShift(1.2);
    setSimulationSpeed(speed);
  };

  const handleFlagChange = (flag) => {
    playStartingBeep(flag === 'GREEN');
    setFlagStatus(flag);
    toast(`Race Flag updated to ${flag}`, {
      icon: flag === 'GREEN' ? '🟢' : flag === 'RED' ? '🔴' : '🟡',
    });
  };

  const handleJumpTime = (deltaSec) => {
    playPaddleShift(1.1);
    handleSeekReplayTime(replayTimeSec + deltaSec);
  };

  const handleOvertake = useCallback((overtaker, passedCar) => {
    playPaddleShift(1.2);
    const newEvent = {
      id: `${Date.now()}-${overtaker.id}`,
      text: `🏎️ ${overtaker.name} (${overtaker.code}) overtook ${passedCar.name} (${passedCar.code})!`,
      time: `Lap ${overtaker.lap || 1}`,
    };
    setRaceEvents((prev) => [newEvent, ...prev.slice(0, 14)]);
  }, []);

  const selectedDriver = (liveDrivers.length > 0 ? liveDrivers : drivers).find((d) => d.id === selectedDriverId) || null;
  const leaderDriver = (liveDrivers.length > 0 ? liveDrivers : drivers)[0] || null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── State 1: Before Race Starts (Pre-Race Lounge with Countdown) ── */}
      {!isLiveBroadcasting && (
        <PreRaceCountdownView
          nextRaceData={nextRaceData}
          circuitDetails={circuitDetails}
          drivers={drivers}
          onEnterLiveStream={() => {
            setIsReplayMode(false);
            setIsLiveBroadcasting(true);
            toast.success('Live 2D telemetry connected to OpenF1 stream!');
          }}
          onSelectReplay={() => {
            handleSelectReplay(0);
          }}
        />
      )}

      {/* ── State 2: Live Race Broadcast (2D Track, Timing Tower, HUD) ── */}
      {isLiveBroadcasting && (
        <div className="space-y-6">
          {/* Header Bar with Back Button */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  playPaddleShift(1.0);
                  setIsLiveBroadcasting(false);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              >
                <span>← Back to Pre-Race Lounge</span>
              </button>

              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-red-500/15 text-f1red border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-f1red animate-ping" />
                {isReplayMode ? 'OFFICIAL GP REPLAY' : 'OPENF1 LIVE REAL-TIME FEED'}
              </span>
            </div>

            {/* Circuit & Replay Selectors */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedCircuitKey}
                onChange={(e) => handleCircuitChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#090b10] border border-white/15 text-white font-mono text-xs font-bold focus:outline-none focus:border-f1red cursor-pointer shadow-lg"
              >
                {OFFICIAL_F1_CALENDAR.map((c) => (
                  <option key={c.key} value={c.key} className="bg-dark-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedReplayIndex}
                onChange={(e) => handleSelectReplay(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 rounded-xl bg-[#090b10] border border-white/15 text-amber-400 font-mono text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer shadow-lg"
              >
                {HISTORICAL_REPLAYS.map((r, idx) => (
                  <option key={idx} value={idx} className="bg-dark-900 text-white">
                    📼 {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Player Control Bar (Play/Pause, Flags, Speed) ── */}
          <div className="p-3 rounded-2xl bg-[#090b10] border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2 flex-wrap">
              {isReplayMode && (
                <div className="flex items-center gap-1">
                  {[-60, -30, -5].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleJumpTime(sec)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] font-mono text-gray-300 font-bold border border-white/10 transition-all"
                    >
                      {sec < -59 ? '-1m' : `${sec}s`}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleTogglePlay}
                className="px-3.5 py-1.5 rounded-xl bg-f1red hover:bg-red-700 text-white font-mono text-xs font-black shadow-lg shadow-red-900/30 transition-all flex items-center gap-1.5"
              >
                <span>{isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}</span>
              </button>

              {isReplayMode && (
                <div className="flex items-center gap-1">
                  {[5, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleJumpTime(sec)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] font-mono text-gray-300 font-bold border border-white/10 transition-all"
                    >
                      {sec >= 60 ? '+1m' : `+${sec}s`}
                    </button>
                  ))}
                </div>
              )}

              {/* Speed Presets */}
              <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                {[0.5, 1, 2, 5, 10, 20].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      simulationSpeed === speed
                        ? 'bg-amber-500 text-black font-black'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Flag Controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">FLAGS:</span>
              <div className="flex items-center gap-1">
                {[
                  { flag: 'GREEN',  label: '🟢 GREEN' },
                  { flag: 'YELLOW', label: '🟡 YELLOW' },
                  { flag: 'SC',     label: '🔸 SC' },
                  { flag: 'VSC',    label: '⚡ VSC' },
                  { flag: 'RED',     label: '🔴 RED' },
                ].map((f) => (
                  <button
                    key={f.flag}
                    onClick={() => handleFlagChange(f.flag)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                      flagStatus === f.flag
                        ? 'bg-white/20 text-white border-white'
                        : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Replay Scrubbing Progress Bar */}
          {isReplayMode && (
            <div className="p-3 rounded-2xl bg-[#090b10] border border-white/10 space-y-1.5 shadow-xl">
              <div className="flex items-center justify-between text-xs font-mono text-gray-400 font-bold">
                <span className="text-white">RACE TIMELINE SCRUBBER</span>
                <span>
                  {formatTime(replayTimeSec)} / {formatTime(totalRaceDurationSec)} (LAP {currentLap} / {totalLaps})
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={totalRaceDurationSec}
                step={0.5}
                value={replayTimeSec}
                onChange={(e) => handleSeekReplayTime(e.target.value)}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-f1red"
              />
            </div>
          )}

          {/* Dual Driver Telemetry Strip */}
          <LiveRaceHUD
            selectedDriver={selectedDriver}
            leaderDriver={leaderDriver}
            flagStatus={flagStatus}
            currentLap={currentLap}
            totalLaps={totalLaps}
            circuitDetails={circuitDetails}
            onDeselectDriver={() => setSelectedDriverId(null)}
          />

          {/* 2D Track Visualizer & Live Timing Tower */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-4">
              <LiveTrackVisualizer
                drivers={liveDrivers.length > 0 ? liveDrivers : drivers}
                selectedDriverId={selectedDriverId}
                onSelectDriver={setSelectedDriverId}
                circuitDetails={circuitDetails}
                flagStatus={flagStatus}
                isPlaying={isPlaying}
                simulationSpeed={simulationSpeed}
                lapDurationSec={lapDurationSec}
                currentLapNum={currentLap}
                totalLaps={totalLaps}
                replayTimeSec={replayTimeSec}
                replayTimeline={replayTimeline}
                onOvertake={handleOvertake}
                onPositionsUpdate={setLiveDrivers}
              />

              {/* Live Event Feed */}
              <div className="p-4 rounded-2xl bg-[#090b10] border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🎙️</span>
                    <span>LIVE RACE COMMENTARY & TELEMETRY LOG</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    REAL-TIME OPENF1 UPDATES
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono text-gray-300 divide-y divide-white/5 max-h-28 overflow-y-auto">
                  {raceEvents.map((evt, idx) => (
                    <div key={idx} className="pt-1.5 flex items-start gap-2">
                      <span className="text-gray-500 font-bold shrink-0">{evt.time}:</span>
                      <span>{evt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <LiveTimingTower
                drivers={liveDrivers.length > 0 ? liveDrivers : drivers}
                selectedDriverId={selectedDriverId}
                onSelectDriver={setSelectedDriverId}
                currentLap={currentLap}
                totalLaps={totalLaps}
                lapDurationSec={lapDurationSec}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRace;
