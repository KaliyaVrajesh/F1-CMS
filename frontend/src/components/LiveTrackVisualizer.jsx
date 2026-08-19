import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';
import { getTeamName } from '../utils/teamColors';

// Realistic driver performance rating modifiers
const DRIVER_PACE_RATINGS = {
  verstappen: 1.028,
  norris:     1.025,
  leclerc:    1.020,
  hamilton:   1.018,
  piastri:    1.016,
  russell:    1.014,
  antonelli:  1.010,
  sainz:      1.008,
  alonso:     1.006,
  albon:      1.000,
  gasly:      0.996,
  lawson:     0.994,
  tsunoda:    0.992,
  hadjar:     0.990,
  bearman:    0.988,
  ocon:       0.986,
  hulkenberg: 0.984,
  stroll:     0.982,
  bortoleto:  0.980,
  doohan:     0.978,
};

const LiveTrackVisualizer = ({
  circuitDetails,
  drivers = [],
  selectedDriverId = null,
  onSelectDriver = () => {},
  isPlaying = true,
  simulationSpeed = 1.0,
  flagStatus = 'GREEN', // GREEN | YELLOW | SC | VSC | RED
  viewMode = 'LIVE_TRACK', // LIVE_TRACK | GP_REPLAY
  replayTimeSec = 0,
  lapDurationSec = 88.0,
  replayTimeline = [],
  currentLap = 1,
  totalLaps = 57,
  onOvertake = () => {},
  onPositionsUpdate = () => {},
}) => {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const [svgPathD, setSvgPathD] = useState('');
  const [viewBox, setViewBox] = useState('0 0 500 400');
  const [trackLength, setTrackLength] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [hoveredDriver, setHoveredDriver] = useState(null);

  // Driver states & references
  const driversStateRef = useRef([]);
  const [driverRenderPositions, setDriverRenderPositions] = useState([]);
  const lastFrameTimeRef = useRef(performance.now());
  const animFrameIdRef = useRef(null);
  const lastTimingSyncRef = useRef(0);
  const previousRankOrderRef = useRef([]);

  // Load Circuit SVG file
  useEffect(() => {
    if (!circuitDetails?.file) return;

    let isMounted = true;
    fetch(`/circuits/${circuitDetails.file}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error('Circuit SVG not found');
        return res.text();
      })
      .then((svgText) => {
        if (!isMounted) return;
        const vbMatch = svgText.match(/viewBox="([^"]+)"/i);
        if (vbMatch) setViewBox(vbMatch[1]);

        const pathMatches = [...svgText.matchAll(/\sd="([^"]+)"/g)];
        const paths = pathMatches.map((m) => m[1]).filter((d) => d.length > 40);
        if (paths.length > 0) {
          const mainPath = paths.reduce((a, b) => (a.length > b.length ? a : b));
          setSvgPathD(mainPath);
        }
      })
      .catch((err) => {
        console.warn('Fallback loading circuit SVG:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [circuitDetails]);

  // Compute SVG track length when path renders
  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setTrackLength(len);
    }
  }, [svgPathD]);

  // Calculate circuit centroid to orient infield vectors reliably
  const circuitCentroid = useMemo(() => {
    if (!pathRef.current || trackLength === 0) return { cx: 250, cy: 200 };
    const svgPath = pathRef.current;
    let sumX = 0;
    let sumY = 0;
    const samples = 36;
    for (let i = 0; i < samples; i++) {
      const pt = svgPath.getPointAtLength((i / samples) * trackLength);
      sumX += pt.x;
      sumY += pt.y;
    }
    return { cx: sumX / samples, cy: sumY / samples };
  }, [trackLength]);

  // Normal vector calculation oriented toward circuit infield / pit lane
  const getInfieldNormal = useCallback((dist, pathObj, length, centroid) => {
    if (!pathObj || length === 0) return { nx: 0, ny: 0, tx: 1, ty: 0, angle: 0, x: 0, y: 0 };
    const d1 = Math.max(0, Math.min(length, dist));
    const d2 = (d1 + 3) % length;
    const p1 = pathObj.getPointAtLength(d1);
    const p2 = pathObj.getPointAtLength(d2);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;

    // Perpendicular normal candidate
    let nx = -ty;
    let ny = tx;

    // Vector to infield centroid
    const vx = centroid.cx - p1.x;
    const vy = centroid.cy - p1.y;

    // Ensure normal points inward to infield / pit straight
    if (nx * vx + ny * vy < 0) {
      nx = -nx;
      ny = -ny;
    }

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { nx, ny, tx, ty, angle, x: p1.x, y: p1.y };
  }, []);

  // Compute Pit Lane SVG Path along Start/Finish straight
  const pitLanePathD = useMemo(() => {
    if (!pathRef.current || trackLength === 0) return '';
    const svgPath = pathRef.current;
    const centroid = circuitCentroid;

    const steps = 30;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps; // 0 to 1
      let prog = 0.94 + fraction * 0.12;
      if (prog >= 1.0) prog -= 1.0;

      const dist = prog * trackLength;
      const { nx, ny, x, y } = getInfieldNormal(dist, svgPath, trackLength, centroid);

      // Taper at pit entry and exit: 0 -> 15px -> 0px
      let offset = 15;
      if (fraction < 0.15) {
        offset = (fraction / 0.15) * 15;
      } else if (fraction > 0.85) {
        offset = ((1.0 - fraction) / 0.15) * 15;
      }

      points.push({ x: x + nx * offset, y: y + ny * offset });
    }

    if (points.length < 2) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
    }
    return d;
  }, [trackLength, circuitCentroid, getInfieldNormal]);

  // Initialize / Sync driver positions
  useEffect(() => {
    if (drivers.length === 0) return;

    const basePositions = drivers.map((d, index) => {
      let prog = d.progress;
      if (prog === undefined || prog === null) {
        prog = (0.998 - index * 0.0018 + 1.0) % 1.0;
      }

      const pace = DRIVER_PACE_RATINGS[d.id] || 1.0 - index * 0.002;
      // Assign realistic strategic pit laps for LIVE_TRACK mode
      const startingTire = d.tire || (index % 3 === 0 ? 'SOFT' : index % 2 === 0 ? 'MEDIUM' : 'HARD');
      const strategyPitLap = startingTire === 'SOFT' ? 16 + (index % 4) : startingTire === 'MEDIUM' ? 24 + (index % 4) : 34 + (index % 4);

      return {
        id: d.id,
        code: d.code,
        name: d.name,
        team: d.team,
        color: d.color,
        number: d.number,
        progress: prog,
        speed: d.speed || 245,
        lap: d.lap || 1,
        drsOpen: d.drsOpen || false,
        photo: d.photo,
        tire: startingTire,
        strategyPitLap,
        inPit: d.inPit || false,
        pitState: d.pitState || 'NONE', // 'NONE' | 'ENTERING' | 'IN_BOX' | 'EXITING'
        pitTimer: d.pitTimer || 2.4,
        pitDuration: d.pitDuration || '2.4s',
        pitLaneOffset: d.pitLaneOffset || 0,
        paceFactor: pace,
      };
    });

    driversStateRef.current = basePositions;
    previousRankOrderRef.current = basePositions.map((c) => c.id);
  }, [drivers]);

  // Speed calculation based on track curvature & DRS zones
  const calculateSpeedAtProgress = useCallback(
    (progress, drsZones = [], isDrsActive = false) => {
      const inDrs = drsZones.some((z) => progress >= z.start && progress <= z.end);
      if (inDrs) {
        return { speed: isDrsActive ? 342 : 325, isDrs: true };
      }

      const turnMilestones = circuitDetails?.turnMilestones || [];
      const nearTurn = turnMilestones.some((t) => Math.abs(progress - t.pos) < 0.025);
      if (nearTurn) return { speed: 105, isDrs: false };

      return { speed: 255 + Math.sin(progress * Math.PI * 8) * 35, isDrs: false };
    },
    [circuitDetails]
  );

  // 60FPS Physics & Real-Time Sync Loop
  useEffect(() => {
    if (!pathRef.current || trackLength === 0) return;

    const svgPath = pathRef.current;
    const drsZones = circuitDetails?.drsZones || [];
    const lapDuration = circuitDetails?.averageLapTimeSec || lapDurationSec || 88.0;

    const tick = (now) => {
      const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1);
      lastFrameTimeRef.current = now;

      // ── GP_REPLAY MODE: Telemetry timeline mapping with authentic pit stops ──
      if (viewMode === 'GP_REPLAY') {
        const currentLapNum = Math.min(totalLaps, Math.floor(replayTimeSec / lapDuration) + 1);
        const leaderProg = (replayTimeSec % lapDuration) / lapDuration;
        const currentLapTimeline = replayTimeline[currentLapNum - 1];

        driversStateRef.current.forEach((car, index) => {
          const gapFraction = index * 0.014;
          let carProg = (leaderProg - gapFraction + 1.0) % 1.0;

          // Check if this driver is scheduled to pit on the current lap in the official replay
          const pitData = currentLapTimeline?.pitStops?.find(
            (p) =>
              String(p.id).toLowerCase() === String(car.id).toLowerCase() ||
              String(p.code).toLowerCase() === String(car.code).toLowerCase()
          );
          const isScheduledToPit = Boolean(pitData) || (car.pitted && car.lap === currentLapNum);

          if (isScheduledToPit) {
            // Pit straight zone (0.94 -> 0.06)
            if (carProg >= 0.94 || carProg <= 0.06) {
              car.inPit = true;

              // Phase 1: Pit Entry (0.94 - 0.995)
              if (carProg >= 0.94 && carProg < 0.995) {
                car.pitState = 'ENTERING';
                car.speed = 80;
                car.drsOpen = false;
                const entryFactor = (carProg - 0.94) / 0.055;
                car.pitLaneOffset = Math.min(15, Math.max(0, entryFactor * 15));
              }
              // Phase 2: Stopped in Pit Box (0.995 - 0.006)
              else if (carProg >= 0.995 || carProg <= 0.006) {
                car.pitState = 'IN_BOX';
                car.speed = 0; // Stationary tire change!
                car.drsOpen = false;
                car.pitLaneOffset = 15;
                car.pitDuration = pitData?.pitDuration || '2.4s';
                car.tire = currentLapNum > 32 ? 'HARD' : 'MEDIUM';
              }
              // Phase 3: Pit Exit (0.006 - 0.06)
              else {
                car.pitState = 'EXITING';
                car.speed = 80;
                car.drsOpen = false;
                const exitFactor = (0.06 - carProg) / 0.054;
                car.pitLaneOffset = Math.max(0, Math.min(15, exitFactor * 15));
              }
            } else {
              car.inPit = false;
              car.pitState = 'NONE';
              car.pitLaneOffset = 0;
              const { speed, isDrs } = calculateSpeedAtProgress(carProg, drsZones, index > 0 && gapFraction < 0.03);
              car.speed = speed * (car.paceFactor || 1.0);
              car.drsOpen = isDrs && flagStatus === 'GREEN';
            }
          } else {
            car.inPit = false;
            car.pitState = 'NONE';
            car.pitLaneOffset = 0;
            const { speed, isDrs } = calculateSpeedAtProgress(carProg, drsZones, index > 0 && gapFraction < 0.03);
            car.speed = speed * (car.paceFactor || 1.0);
            car.drsOpen = isDrs && flagStatus === 'GREEN';
          }

          car.progress = carProg;
          car.lap = currentLapNum;
        });

        if (now - lastTimingSyncRef.current > 120) {
          lastTimingSyncRef.current = now;
          onPositionsUpdate([...driversStateRef.current]);
        }
      }
      // ── LIVE_TRACK MODE: Dynamic physical simulation with realistic pit stops ──
      else if (isPlaying && flagStatus !== 'RED') {
        const state = driversStateRef.current;
        const count = state.length;

        let paceScale = (1.0 / lapDuration) * simulationSpeed;
        if (flagStatus === 'SC') paceScale *= 0.45;
        if (flagStatus === 'VSC') paceScale *= 0.60;
        if (flagStatus === 'YELLOW') paceScale *= 0.80;

        for (let i = 0; i < count; i++) {
          const car = state[i];

          // ── Pit Stop State Machine ──
          if (car.pitState === 'IN_BOX') {
            // Car is stationary in pit box swapping tires!
            car.speed = 0;
            car.drsOpen = false;
            car.pitLaneOffset = 15;
            car.pitTimer -= dt * simulationSpeed;

            if (car.pitTimer <= 0) {
              // Pit stop complete, launch down pit straight
              car.pitState = 'EXITING';
              car.tire = car.tire === 'SOFT' ? 'MEDIUM' : 'HARD';
              car.pitTimer = 0;
            }
          } else {
            // Check if car should enter pits on strategic lap or under Safety Car
            const isPitLap =
              car.strategyPitLap === car.lap || (flagStatus === 'SC' && !car.hasPittedSC && car.lap >= 8);

            if (isPitLap && car.progress >= 0.94 && car.progress < 0.97 && car.pitState === 'NONE') {
              car.inPit = true;
              car.pitState = 'ENTERING';
              car.pitTimer = 2.4;
              car.hasPittedSC = true;
            }

            if (car.inPit) {
              if (car.pitState === 'ENTERING') {
                car.speed = 80;
                car.drsOpen = false;
                const entryFactor = (car.progress - 0.94) / 0.055;
                car.pitLaneOffset = Math.min(15, Math.max(0, entryFactor * 15));

                const deltaProgress = ((1.0 / lapDuration) * simulationSpeed * (80 / 240.0)) * dt;
                car.progress = (car.progress + deltaProgress) % 1.0;

                if (car.progress >= 0.998 || car.progress < 0.01) {
                  car.progress = 0.0;
                  car.pitState = 'IN_BOX';
                  car.pitTimer = 2.4;
                }
              } else if (car.pitState === 'EXITING') {
                car.speed = 80;
                car.drsOpen = false;
                const exitFactor = (0.06 - car.progress) / 0.054;
                car.pitLaneOffset = Math.max(0, Math.min(15, exitFactor * 15));

                const deltaProgress = ((1.0 / lapDuration) * simulationSpeed * (80 / 240.0)) * dt;
                car.progress = (car.progress + deltaProgress) % 1.0;

                if (car.progress >= 0.06) {
                  car.inPit = false;
                  car.pitState = 'NONE';
                  car.pitLaneOffset = 0;
                }
              }
            } else {
              // Normal racing line calculation
              let hasDrsBoost = false;
              for (let j = 0; j < count; j++) {
                if (i !== j) {
                  const diff = (state[j].progress - car.progress + 1.0) % 1.0;
                  if (diff > 0.003 && diff < 0.025) {
                    hasDrsBoost = true;
                    break;
                  }
                }
              }

              const { speed, isDrs } = calculateSpeedAtProgress(car.progress, drsZones, hasDrsBoost);
              const dynamicSpeed = speed * (car.paceFactor || 1.0);
              car.speed = dynamicSpeed;
              car.drsOpen = isDrs && flagStatus === 'GREEN';

              const speedRatio = dynamicSpeed / 240.0;
              const deltaProgress = paceScale * speedRatio * dt;
              const prevProg = car.progress;
              car.progress = (car.progress + deltaProgress) % 1.0;

              if (car.progress < prevProg) {
                car.lap += 1;
              }
            }
          }
        }

        // Sync positions back to Timing Tower every 100ms
        if (now - lastTimingSyncRef.current > 100) {
          lastTimingSyncRef.current = now;
          onPositionsUpdate([...state]);

          // Check authentic rank order swaps (no duplicate spamming)
          const sortedCurrent = [...state].sort((a, b) => {
            if (b.lap !== a.lap) return b.lap - a.lap;
            return b.progress - a.progress;
          });
          const newRankOrder = sortedCurrent.map((c) => c.id);
          const prevOrder = previousRankOrderRef.current;

          if (prevOrder.length === newRankOrder.length) {
            for (let pos = 0; pos < newRankOrder.length; pos++) {
              const driverId = newRankOrder[pos];
              const prevPos = prevOrder.indexOf(driverId);
              if (prevPos > pos) {
                const passedDriverId = prevOrder[pos];
                const overtaker = state.find((c) => c.id === driverId);
                const passedCar = state.find((c) => c.id === passedDriverId);
                if (overtaker && passedCar && !overtaker.inPit && !passedCar.inPit) {
                  onOvertake(overtaker, passedCar);
                }
              }
            }
          }
          previousRankOrderRef.current = newRankOrder;
        }
      }

      // Compute exact (x, y) coordinates with pit lane normal offsets
      const computedRenderPositions = driversStateRef.current.map((car) => {
        const currentDist = car.progress * trackLength;
        const norm = getInfieldNormal(currentDist, svgPath, trackLength, circuitCentroid);
        const offset = car.pitLaneOffset || 0;

        return {
          ...car,
          x: norm.x + norm.nx * offset,
          y: norm.y + norm.ny * offset,
        };
      });

      setDriverRenderPositions(computedRenderPositions);
      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [
    trackLength,
    isPlaying,
    simulationSpeed,
    flagStatus,
    calculateSpeedAtProgress,
    circuitDetails,
    circuitCentroid,
    getInfieldNormal,
    viewMode,
    replayTimeSec,
    lapDurationSec,
    replayTimeline,
    totalLaps,
    onOvertake,
    onPositionsUpdate,
  ]);

  // Compute Turn corner (x, y) coordinates for pill badges
  const turnMarkers = useMemo(() => {
    if (!pathRef.current || trackLength === 0 || !circuitDetails?.turnMilestones) return [];
    const svgPath = pathRef.current;

    return circuitDetails.turnMilestones.map((m) => {
      const dist = m.pos * trackLength;
      const pt = svgPath.getPointAtLength(dist);

      const aheadDist = (dist + 3) % trackLength;
      const ptAhead = svgPath.getPointAtLength(aheadDist);
      const dx = ptAhead.x - pt.x;
      const dy = ptAhead.y - pt.y;
      const angle = Math.atan2(dy, dx);

      const offsetDist = 18;
      const x = pt.x - Math.sin(angle) * offsetDist;
      const y = pt.y + Math.cos(angle) * offsetDist;

      return {
        turn: m.turn,
        x,
        y,
      };
    });
  }, [trackLength, circuitDetails]);

  // Compute Start/Finish line coordinates
  const startFinishCoords = useMemo(() => {
    if (!pathRef.current || trackLength === 0) return null;
    const pt = pathRef.current.getPointAtLength(0);
    const ptAhead = pathRef.current.getPointAtLength(4);
    const angle = Math.atan2(ptAhead.y - pt.y, ptAhead.x - pt.x);

    return {
      x: pt.x,
      y: pt.y,
      angle: (angle * 180) / Math.PI + 90,
    };
  }, [trackLength]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] lg:h-[620px] rounded-3xl bg-[#090b10] border border-white/10 overflow-hidden flex items-center justify-center select-none shadow-2xl"
    >
      {/* Zoom / Reset Controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-gray-300">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.0))}
          className="hover:text-white px-1.5 py-0.5 hover:bg-white/10 rounded transition-all"
          title="Zoom In"
        >
          ➕
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
          className="hover:text-white px-1.5 py-0.5 hover:bg-white/10 rounded transition-all"
          title="Zoom Out"
        >
          ➖
        </button>
        <button
          onClick={() => setZoomLevel(1.0)}
          className="hover:text-amber-400 px-1.5 py-0.5 hover:bg-white/10 rounded transition-all uppercase text-[10px]"
          title="Reset Zoom"
        >
          Reset
        </button>
      </div>

      {/* Flag Status Banner Alert */}
      {flagStatus !== 'GREEN' && (
        <div
          className="absolute top-4 left-4 z-30 px-4 py-1.5 rounded-xl font-mono font-black text-xs uppercase tracking-widest flex items-center gap-2 backdrop-blur-md shadow-lg border"
          style={{
            background:
              flagStatus === 'RED'
                ? 'rgba(225, 6, 0, 0.3)'
                : flagStatus === 'SC'
                ? 'rgba(255, 170, 0, 0.35)'
                : 'rgba(255, 215, 0, 0.25)',
            borderColor:
              flagStatus === 'RED' ? '#E10600' : flagStatus === 'SC' ? '#FFAA00' : '#FFD700',
            color: flagStatus === 'RED' ? '#FF6B6B' : flagStatus === 'SC' ? '#FFD066' : '#FFE066',
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full animate-ping bg-current" />
          <span>{flagStatus === 'SC' ? 'SAFETY CAR DEPLOYED' : `FLAG: ${flagStatus}`}</span>
        </div>
      )}

      {/* Main Track SVG Layer */}
      <motion.div
        animate={{ scale: zoomLevel }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="w-full h-full flex items-center justify-center"
      >
        <svg
          viewBox={viewBox}
          className="w-full h-full p-8 overflow-visible"
          style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))' }}
        >
          <defs>
            <pattern id="checkered-flag" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="3" height="3" fill="#FFFFFF" />
              <rect x="3" width="3" height="3" fill="#000000" />
              <rect y="3" width="3" height="3" fill="#000000" />
              <rect x="3" y="3" width="3" height="3" fill="#FFFFFF" />
            </pattern>

            <filter id="drs-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="pit-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Reference Hidden Path */}
          {svgPathD && (
            <path
              ref={pathRef}
              d={svgPathD}
              fill="none"
              stroke="none"
              strokeWidth="1"
            />
          )}

          {/* Track Layer 1: Outer Curb Profile */}
          {svgPathD && (
            <path
              d={svgPathD}
              fill="none"
              stroke="#404654"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          )}

          {/* Track Layer 2: Main Asphalt Road */}
          {svgPathD && (
            <path
              d={svgPathD}
              fill="none"
              stroke="#181B22"
              strokeWidth="15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Track Layer 3: Inner Guide Rail / Centerline */}
          {svgPathD && (
            <path
              d={svgPathD}
              fill="none"
              stroke="#2E3442"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              strokeLinecap="round"
              opacity="0.6"
            />
          )}

          {/* ── Official Pit Lane Surface & Channel ── */}
          {pitLanePathD && (
            <g opacity="0.9">
              {/* Pit Lane Asphalt Surface */}
              <path
                d={pitLanePathD}
                fill="none"
                stroke="#12151C"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Pit Lane Inner Guide Marking */}
              <path
                d={pitLanePathD}
                fill="none"
                stroke="#3B4455"
                strokeWidth="1.2"
                strokeDasharray="2 3"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>
          )}

          {/* DRS Zones Orange Highlights */}
          {trackLength > 0 &&
            circuitDetails?.drsZones?.map((z, idx) => {
              const startOffset = z.start * trackLength;
              const zoneLength = (z.end - z.start) * trackLength;
              return (
                <path
                  key={idx}
                  d={svgPathD}
                  fill="none"
                  stroke="#FF8000"
                  strokeWidth="14"
                  strokeDasharray={`${zoneLength} ${trackLength}`}
                  strokeDashoffset={-startOffset}
                  strokeLinecap="round"
                  opacity="0.75"
                  filter="url(#drs-glow)"
                />
              );
            })}

          {/* Start/Finish Line Checkered Flag */}
          {startFinishCoords && (
            <g
              transform={`translate(${startFinishCoords.x}, ${startFinishCoords.y}) rotate(${startFinishCoords.angle})`}
            >
              <rect
                x="-12"
                y="-3"
                width="24"
                height="6"
                fill="url(#checkered-flag)"
                stroke="#FFFFFF"
                strokeWidth="0.5"
                rx="1"
              />
            </g>
          )}

          {/* Turn Number Badges */}
          {turnMarkers.map((m) => (
            <g key={m.turn} transform={`translate(${m.x}, ${m.y})`}>
              <circle
                r="7.5"
                fill="#242833"
                stroke="#474F61"
                strokeWidth="1"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize="7"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {m.turn}
              </text>
            </g>
          ))}

          {/* Driver Position Dots & Pit Stop Badges */}
          {driverRenderPositions.map((car) => {
            const isSelected = selectedDriverId === car.id;
            const isHovered = hoveredDriver?.id === car.id;
            const isInPit = car.inPit;
            const isInBox = car.pitState === 'IN_BOX';

            return (
              <g
                key={car.id}
                transform={`translate(${car.x}, ${car.y})`}
                onClick={() => {
                  playPaddleShift(1.1);
                  onSelectDriver(car.id === selectedDriverId ? null : car.id);
                }}
                onMouseEnter={() => setHoveredDriver(car)}
                onMouseLeave={() => setHoveredDriver(null)}
                className="cursor-pointer"
              >
                {/* Active Selection Glow Ring */}
                {(isSelected || isHovered) && (
                  <circle
                    r="15"
                    fill="none"
                    stroke={car.color}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ animationDuration: '3s' }}
                  />
                )}

                {/* DRS Open Indicator Flare */}
                {car.drsOpen && !isInPit && (
                  <circle
                    r="12"
                    fill="none"
                    stroke="#FF8000"
                    strokeWidth="1.5"
                    opacity="0.8"
                    className="animate-ping"
                  />
                )}

                {/* ── F1 Game Style Floating Pit Stop Badge ── */}
                {isInPit && (
                  <g transform="translate(0, -17)" className={isInBox ? 'animate-bounce' : ''}>
                    <rect
                      x="-20"
                      y="-8"
                      width="40"
                      height="16"
                      rx="8"
                      fill="#0b0d13"
                      stroke={isInBox ? '#FFD700' : '#FF8000'}
                      strokeWidth="1.5"
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.95))"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isInBox ? '#FFD700' : '#FFFFFF'}
                      fontSize="6.5"
                      fontWeight="900"
                      fontFamily="'Titillium Web', monospace"
                    >
                      {isInBox ? `🔧 ${car.pitTimer > 0 ? car.pitTimer.toFixed(1) + 's' : (car.pitDuration || '2.4s')}` : 'PIT 80'}
                    </text>
                  </g>
                )}

                {/* Driver Dot Circle Badge */}
                <circle
                  r={isInBox ? '10.5' : '9.5'}
                  fill={car.color}
                  stroke={isInBox ? '#FFD700' : '#FFFFFF'}
                  strokeWidth={isInBox ? '2.5' : isSelected ? '2' : '1.2'}
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.85))"
                />

                {/* 3-Letter Driver Code */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={['#FFFFFF', '#B6BABD', '#27F4D2'].includes(car.color) ? '#000000' : '#FFFFFF'}
                  fontSize="6.5"
                  fontWeight="900"
                  fontFamily="'Titillium Web', system-ui, sans-serif"
                  letterSpacing="-0.3px"
                >
                  {car.code}
                </text>
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* Driver Hover Tooltip Card */}
      <AnimatePresence>
        {hoveredDriver && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-4 left-4 z-40 bg-dark-900/95 border border-white/15 px-4 py-3 rounded-2xl backdrop-blur-md shadow-2xl pointer-events-none flex items-center gap-3"
            style={{ borderLeftColor: hoveredDriver.color, borderLeftWidth: '4px' }}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center shrink-0">
              {hoveredDriver.photo ? (
                <img
                  src={hoveredDriver.photo}
                  alt={hoveredDriver.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xs font-black" style={{ color: hoveredDriver.color }}>
                  {hoveredDriver.code}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-f1heading font-black text-white">
                  {hoveredDriver.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-bold">
                  #{hoveredDriver.number}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-gray-400 mt-0.5">
                <span style={{ color: hoveredDriver.color }}>
                  {getTeamName(hoveredDriver.team, hoveredDriver) || (typeof hoveredDriver.team === 'string' ? hoveredDriver.team : 'F1 Team')}
                </span>
                <span>·</span>
                <span className="text-white font-bold">{Math.round(hoveredDriver.speed)} KM/H</span>
                {hoveredDriver.inPit && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    {hoveredDriver.pitState === 'IN_BOX' ? 'STATIONARY PIT BOX' : 'PIT LIMITER'}
                  </span>
                )}
                {hoveredDriver.drsOpen && !hoveredDriver.inPit && (
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    DRS ON
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveTrackVisualizer;
