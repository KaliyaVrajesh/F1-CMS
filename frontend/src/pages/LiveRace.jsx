import { useState, useEffect, useCallback } from 'react';
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

const LiveRace = () => {
  // Modes: 'COUNTDOWN' | 'PRE_GRID' | 'LIVE_BROADCAST' | 'GP_REPLAY'
  const [activeMode, setActiveMode] = useState('LIVE_BROADCAST');
  // Default to Dutch Grand Prix (Circuit Zandvoort) as upcoming race on Aug 23, 2026!
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
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1.0);
  const [flagStatus, setFlagStatus] = useState('GREEN');
  const [currentLap, setCurrentLap] = useState(1);
  const [totalLaps, setTotalLaps] = useState(72);
  const [selectedReplayIndex, setSelectedReplayIndex] = useState(0);
  const [replayTimeline, setReplayTimeline] = useState([]);
  const [raceEvents, setRaceEvents] = useState([
    { id: 1, text: '🟢 Green Flag! Real-time session active on circuit.', time: 'Lap 1' },
    { id: 2, text: '📡 DRS zones enabled by FIA Race Control.', time: 'Lap 2' },
  ]);

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

  // Update circuit details when selection changes
  const handleCircuitChange = (key) => {
    playPaddleShift(1.0);
    setSelectedCircuitKey(key);
    const details = getCircuitDetails(key);
    setCircuitDetails(details);
    setTotalLaps(details.totalLaps);
    setCurrentLap(1);
    toast.success(`Loaded ${details.name}`);
  };

  // Handle overtakes on track
  const handleOvertake = useCallback((overtaker, passedCar) => {
    playPaddleShift(1.2);
    const newEvent = {
      id: `${Date.now()}-${overtaker.id}`,
      text: `🏎️ ${overtaker.name} (${overtaker.code}) overtook ${passedCar.name} (${passedCar.code}) into the turn!`,
      time: `Lap ${overtaker.lap || 1}`,
    };
    setRaceEvents((prev) => [newEvent, ...prev.slice(0, 14)]);
  }, []);

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
      setTotalLaps(replayData.totalLaps);
      setReplayTimeline(replayData.lapsTimeline);
      setCurrentLap(1);

      const details = getCircuitDetails(replayInfo.circuitKey);
      setSelectedCircuitKey(details.file);
      setCircuitDetails(details);

      const overtakesList = [];
      replayData.lapsTimeline.forEach((lapItem) => {
        lapItem.overtakes.forEach((o) => {
          overtakesList.push({
            id: `${o.lap}-${o.overtaker.code}`,
            text: `🏎️ ${o.overtaker.name} (${o.overtaker.code}) overtook ${o.passed.name} for P${o.newPos}!`,
            time: `Lap ${o.lap}`,
          });
        });
      });

      if (overtakesList.length > 0) {
        setRaceEvents(overtakesList.slice(0, 15));
      }

      setActiveMode('GP_REPLAY');
      toast.success(`Official replay loaded: ${replayInfo.name}`);
    } else {
      toast.error('Failed to load replay data, using default session.');
    }
  };

  // Handle lap scrub in replay mode
  const handleLapScrub = (lapNum) => {
    const lap = parseInt(lapNum, 10);
    setCurrentLap(lap);
    if (replayTimeline[lap - 1]) {
      setDrivers(replayTimeline[lap - 1].positions);
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

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Page Top Mode Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-red-500/15 text-f1red border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-f1red animate-ping" />
              {activeMode === 'LIVE_BROADCAST'
                ? 'LIVE REAL-TIME STREAM'
                : activeMode === 'PRE_GRID'
                ? 'PRE-GRID FORMATION'
                : activeMode === 'COUNTDOWN'
                ? 'PRE-RACE WAITING ROOM'
                : 'OFFICIAL GP REPLAY'}
            </span>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-400 font-mono text-xs uppercase">
              {circuitDetails?.name}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-f1heading font-black text-white uppercase tracking-wider">
            <span className="text-f1red">Live</span> Race Broadcast
          </h1>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-[#090b10] p-1.5 rounded-2xl border border-white/15 shadow-xl">
          {[
            { mode: 'LIVE_BROADCAST', label: '🔴 Live Broadcast' },
            { mode: 'PRE_GRID',       label: '🟡 30m Pre-Grid' },
            { mode: 'COUNTDOWN',      label: '⏱️ Pre-Race Room' },
            { mode: 'GP_REPLAY',       label: '📼 GP Replay' },
          ].map((tab) => (
            <button
              key={tab.mode}
              onClick={() => {
                playPaddleShift(1.0);
                setActiveMode(tab.mode);
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                activeMode === tab.mode
                  ? 'bg-f1red text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Mode 1: Pre-Race Countdown Waiting Room ── */}
      {activeMode === 'COUNTDOWN' && (
        <PreRaceCountdownView
          nextRaceData={nextRaceData}
          circuitDetails={circuitDetails}
          drivers={drivers}
          onEnterPreGrid={() => setActiveMode('PRE_GRID')}
          onEnterLiveStream={() => setActiveMode('LIVE_BROADCAST')}
          onSelectReplay={() => setActiveMode('GP_REPLAY')}
        />
      )}

      {/* ── Mode 2, 3, 4: Live 2D Track Broadcast / Pre-Grid / GP Replay ── */}
      {activeMode !== 'COUNTDOWN' && (
        <>
          {/* ── Playback Controls & Replay Scrubber ── */}
          <div className="p-3 rounded-2xl bg-[#090b10] border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            {/* Left: Play/Pause & Speed */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>{isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}</span>
              </button>

              {/* Speed toggles */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                {[1.0, 2.0, 5.0, 10.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      simulationSpeed === s
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Middle: If GP_REPLAY, Lap Scrubber */}
            {activeMode === 'GP_REPLAY' ? (
              <div className="flex items-center gap-3 flex-1 max-w-md mx-2">
                <span className="text-xs font-mono text-gray-400 font-bold shrink-0">
                  LAP {currentLap} / {totalLaps}
                </span>
                <input
                  type="range"
                  min="1"
                  max={totalLaps}
                  value={currentLap}
                  onChange={(e) => handleLapScrub(e.target.value)}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-f1red"
                />
              </div>
            ) : (
              /* Middle: Race Flags */
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden md:inline mr-1">
                  FLAGS:
                </span>
                {[
                  { flag: 'GREEN', label: '🟢 GREEN' },
                  { flag: 'YELLOW', label: '🟡 YELLOW' },
                  { flag: 'SC', label: '🔶 SC' },
                  { flag: 'VSC', label: '⚡ VSC' },
                  { flag: 'RED', label: '🔴 RED' },
                ].map((f) => (
                  <button
                    key={f.flag}
                    onClick={() => handleFlagChange(f.flag)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      flagStatus === f.flag
                        ? 'bg-white/20 text-white border border-white/30 shadow-md'
                        : 'text-gray-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Right: Calendar Circuit / Replay Selector */}
            <div className="flex items-center gap-2">
              {activeMode === 'GP_REPLAY' ? (
                <select
                  value={selectedReplayIndex}
                  onChange={(e) => handleSelectReplay(parseInt(e.target.value, 10))}
                  className="bg-dark-900 border border-white/15 text-white text-xs font-mono px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer shadow-lg"
                >
                  {HISTORICAL_REPLAYS.map((r, idx) => (
                    <option key={idx} value={idx} className="bg-dark-900 text-white">
                      {r.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedCircuitKey}
                  onChange={(e) => handleCircuitChange(e.target.value)}
                  className="bg-dark-900 border border-white/15 text-white text-xs font-mono px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer shadow-lg"
                >
                  {OFFICIAL_F1_CALENDAR.map((c) => (
                    <option key={c.key} value={c.key} className="bg-dark-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* ── Race HUD Status ── */}
          <LiveRaceHUD
            circuitDetails={circuitDetails}
            flagStatus={flagStatus}
            currentLap={currentLap}
            totalLaps={totalLaps}
            selectedDriver={selectedDriver}
            onDeselectDriver={() => setSelectedDriverId(null)}
          />

          {/* ── Main Layout: Track Visualizer (Left) & Timing Tower (Right) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 2D Track Map (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <LiveTrackVisualizer
                circuitDetails={circuitDetails}
                drivers={drivers}
                selectedDriverId={selectedDriverId}
                onSelectDriver={setSelectedDriverId}
                isPlaying={isPlaying}
                simulationSpeed={simulationSpeed}
                flagStatus={flagStatus}
                viewMode={activeMode}
                onOvertake={handleOvertake}
              />

              {/* Live Race Event Feed */}
              <div className="p-4 rounded-2xl bg-[#090b10] border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🎙️</span>
                    <span>
                      {activeMode === 'GP_REPLAY'
                        ? 'AUTHENTIC OVERTAKES & PIT LOG'
                        : 'LIVE RACE COMMENTARY & EVENTS'}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    REAL-TIME UPDATES
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

            {/* Right Column: Live Timing Tower (4 cols) */}
            <div className="lg:col-span-4">
              <LiveTimingTower
                drivers={drivers}
                selectedDriverId={selectedDriverId}
                onSelectDriver={setSelectedDriverId}
                currentLap={currentLap}
                totalLaps={totalLaps}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveRace;
