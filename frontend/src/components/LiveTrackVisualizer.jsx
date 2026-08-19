import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPaddleShift } from '../utils/audio';

// Realistic driver performance rating modifiers
const DRIVER_PACE_RATINGS = {
  verstappen: 1.038,
  norris:     1.035,
  leclerc:    1.030,
  hamilton:   1.028,
  piastri:    1.025,
  russell:    1.024,
  antonelli:  1.018,
  sainz:      1.016,
  alonso:     1.015,
  albon:      1.008,
  gasly:      1.002,
  lawson:     1.000,
  tsunoda:    0.998,
  hadjar:     0.995,
  bearman:    0.992,
  ocon:       0.990,
  hulkenberg: 0.985,
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
  viewMode = 'LIVE_BROADCAST', // LIVE_BROADCAST | PRE_GRID | GP_REPLAY
  replayLapData = null,
  onOvertake = () => {},
}) => {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const [svgPathD, setSvgPathD] = useState('');
  const [viewBox, setViewBox] = useState('0 0 500 400');
  const [trackLength, setTrackLength] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [hoveredDriver, setHoveredDriver] = useState(null);

  // Driver states
  const driversStateRef = useRef([]);
  const [driverRenderPositions, setDriverRenderPositions] = useState([]);
  const lastFrameTimeRef = useRef(performance.now());
  const animFrameIdRef = useRef(null);
  const lastOvertakeCheckRef = useRef(0);

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

  // Initialize driver positions based on current view mode
  useEffect(() => {
    if (drivers.length === 0) return;

    if (viewMode === 'PRE_GRID') {
      const gridPositions = drivers.map((d, index) => {
        const gridProgress = 0.985 - index * 0.016;
        const sideOffset = index % 2 === 0 ? -7 : 7;
        return {
          id: d.id,
          code: d.code,
          name: d.name,
          team: d.team,
          color: d.color,
          number: d.number,
          progress: (gridProgress + 1.0) % 1.0,
          speed: 0,
          lap: 0,
          lateralOffset: sideOffset,
          drsOpen: false,
          photo: d.photo,
          tire: 'MEDIUM',
          paceFactor: 1.0,
        };
      });
      driversStateRef.current = gridPositions;
      return;
    }

    // Live Broadcast / Replay dynamic positioning
    const basePositions = drivers.map((d, index) => {
      const initialProgress = (1.0 - index * 0.038) % 1.0;
      const pace = DRIVER_PACE_RATINGS[d.id] || (1.0 - index * 0.003);
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        team: d.team,
        color: d.color,
        number: d.number,
        progress: (initialProgress + 1.0) % 1.0,
        speed: 240,
        lap: 1,
        lateralOffset: 0,
        drsOpen: false,
        photo: d.photo,
        tire: index % 3 === 0 ? 'SOFT' : index % 2 === 0 ? 'MEDIUM' : 'HARD',
        paceFactor: pace,
        isOvertaking: false,
      };
    });

    driversStateRef.current = basePositions;
  }, [drivers, viewMode]);

  // Speed calculation heuristic based on track geometry & DRS zones
  const calculateSpeedAtProgress = useCallback(
    (progress, drsZones = [], isDrsActive = false) => {
      const inDrs = drsZones.some((z) => progress >= z.start && progress <= z.end);
      if (inDrs) {
        return { speed: isDrsActive ? 342 : 325, isDrs: true };
      }

      const turnMilestones = circuitDetails?.turnMilestones || [];
      const nearTurn = turnMilestones.some((t) => Math.abs(progress - t.pos) < 0.025);
      if (nearTurn) return { speed: 98, isDrs: false };

      return { speed: 255 + Math.sin(progress * Math.PI * 8) * 35, isDrs: false };
    },
    [circuitDetails]
  );

  // 60FPS Physics & Dynamic Overtaking Loop
  useEffect(() => {
    if (!pathRef.current || trackLength === 0) return;

    const svgPath = pathRef.current;
    const drsZones = circuitDetails?.drsZones || [];

    const tick = (now) => {
      const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1);
      lastFrameTimeRef.current = now;

      if (isPlaying && flagStatus !== 'RED' && viewMode !== 'PRE_GRID') {
        const state = driversStateRef.current;
        const count = state.length;

        let paceModifier = simulationSpeed * 0.048;
        if (flagStatus === 'SC') paceModifier *= 0.45;
        if (flagStatus === 'VSC') paceModifier *= 0.60;
        if (flagStatus === 'YELLOW') paceModifier *= 0.80;

        // Check slipstreaming, DRS activation, and overtakes
        for (let i = 0; i < count; i++) {
          const car = state[i];
          let hasDrsBoost = false;

          // Look for car ahead within DRS detection range (0.015 to 0.035 progress)
          for (let j = 0; j < count; j++) {
            if (i !== j) {
              const diff = (state[j].progress - car.progress + 1.0) % 1.0;
              if (diff > 0.005 && diff < 0.032) {
                // Within DRS range!
                hasDrsBoost = true;
                break;
              }
            }
          }

          const { speed, isDrs } = calculateSpeedAtProgress(car.progress, drsZones, hasDrsBoost);
          const dynamicSpeed = speed * (car.paceFactor || 1.0);
          car.speed = dynamicSpeed;
          car.drsOpen = isDrs && flagStatus === 'GREEN';

          // Move car forward on track
          const deltaProgress = (dynamicSpeed / 300) * paceModifier * dt;
          const prevProg = car.progress;
          car.progress = (car.progress + deltaProgress) % 1.0;

          if (car.progress < prevProg) {
            car.lap += 1;
          }
        }

        // Dynamic lateral lane positioning for wheel-to-wheel battles
        for (let i = 0; i < count; i++) {
          let overlapCount = 0;
          for (let j = 0; j < count; j++) {
            if (i !== j) {
              const dist = Math.abs(state[i].progress - state[j].progress);
              if (dist < 0.018 || dist > 0.982) {
                overlapCount += i > j ? 1 : -1;
              }
            }
          }
          state[i].lateralOffset = overlapCount * 13;
        }

        // Check overtakes periodically (every 500ms)
        if (now - lastOvertakeCheckRef.current > 500) {
          lastOvertakeCheckRef.current = now;
          for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
              const carA = state[i];
              const carB = state[j];
              // If Car A (behind) just passed Car B
              if (
                carA.paceFactor > carB.paceFactor &&
                Math.abs(carA.progress - carB.progress) < 0.012 &&
                !carA.isOvertaking
              ) {
                carA.isOvertaking = true;
                setTimeout(() => {
                  carA.isOvertaking = false;
                }, 4000);
                onOvertake(carA, carB);
              }
            }
          }
        }
      }

      // Compute visual screen coordinates (x, y, angle) from SVG path
      const computedRenderPositions = driversStateRef.current.map((car) => {
        const currentDist = car.progress * trackLength;
        const pt = svgPath.getPointAtLength(Math.max(0, Math.min(trackLength, currentDist)));

        // Normal tangent vector for lateral offset
        const aheadDist = (currentDist + 2) % trackLength;
        const ptAhead = svgPath.getPointAtLength(aheadDist);
        const dx = ptAhead.x - pt.x;
        const dy = ptAhead.y - pt.y;
        const angle = Math.atan2(dy, dx);

        const perpX = -Math.sin(angle) * (car.lateralOffset || 0);
        const perpY = Math.cos(angle) * (car.lateralOffset || 0);

        return {
          ...car,
          x: pt.x + perpX,
          y: pt.y + perpY,
          angle: (angle * 180) / Math.PI,
        };
      });

      setDriverRenderPositions(computedRenderPositions);
      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [trackLength, isPlaying, simulationSpeed, flagStatus, calculateSpeedAtProgress, circuitDetails, viewMode, onOvertake]);

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

      {/* Pre-Grid Formation Overlay Banner */}
      {viewMode === 'PRE_GRID' && (
        <div className="absolute top-4 left-4 z-30 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-black text-xs uppercase tracking-widest backdrop-blur-md shadow-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>30-MIN PRE-GRID FORMATION · PIT LANE OPEN</span>
        </div>
      )}

      {/* Flag Status Banner Alert */}
      {flagStatus !== 'GREEN' && viewMode !== 'PRE_GRID' && (
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

          {/* Driver Position Dots on Track */}
          {driverRenderPositions.map((car) => {
            const isSelected = selectedDriverId === car.id;
            const isHovered = hoveredDriver?.id === car.id;

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
                {car.drsOpen && (
                  <circle
                    r="12"
                    fill="none"
                    stroke="#FF8000"
                    strokeWidth="1.5"
                    opacity="0.8"
                    className="animate-ping"
                  />
                )}

                {/* Driver Dot Circle Badge */}
                <circle
                  r="9.5"
                  fill={car.color}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? '2' : '1.2'}
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
                <span style={{ color: hoveredDriver.color }}>{hoveredDriver.team}</span>
                <span>·</span>
                <span className="text-white font-bold">{Math.round(hoveredDriver.speed)} KM/H</span>
                {hoveredDriver.drsOpen && (
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
