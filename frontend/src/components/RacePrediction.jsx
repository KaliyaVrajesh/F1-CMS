import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getF1Prediction } from '../services/api';

// ── Team colours ──────────────────────────────────────────────────────────────
const TEAM_COLOURS = {
  red_bull:     '#3671C6',
  ferrari:      '#E8002D',
  mercedes:     '#27F4D2',
  mclaren:      '#FF8000',
  aston_martin: '#229971',
  alpine:       '#0093CC',
  williams:     '#64C4FF',
  rb:           '#6692FF',
  kick_sauber:  '#52E252',
  haas:         '#B6BABD',
};
const teamColour = (id = '') =>
  TEAM_COLOURS[id.toLowerCase().replace(/[^a-z_]/g, '_')] || '#E10600';

// ── Medal ─────────────────────────────────────────────────────────────────────
const MEDAL = ['🥇', '🥈', '🥉'];

// ── Animated probability bar ──────────────────────────────────────────────────
const ProbBar = ({ value, colour, delay = 0 }) => {
  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    el.style.width = '0%';
    const t = setTimeout(() => {
      el.style.transition = 'width 1.2s cubic-bezier(0.16,1,0.3,1)';
      el.style.width = `${Math.min(value, 99.9)}%`;
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div ref={barRef} className="h-full rounded-full" style={{ background: colour }} />
    </div>
  );
};

// ── Confidence ring (SVG donut) ────────────────────────────────────────────────
const Ring = ({ pct, colour, size = 52 }) => {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setDrawn(pct), 80);
    });
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.08} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colour} strokeWidth={size * 0.08}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - drawn / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.22} fontWeight="900" fontFamily="monospace">
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

// ── Top-3 podium card ─────────────────────────────────────────────────────────
const PodiumCard = ({ driver, position }) => {
  const colour = teamColour(driver.constructorId);
  const heights = ['h-28', 'h-20', 'h-16'];
  const widths  = ['w-28', 'w-24', 'w-24'];
  const order   = [1, 0, 2]; // P2 left, P1 centre, P3 right

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: order[position] * 0.12 + 0.3 }}
      className={`flex flex-col items-center ${widths[position]}`}
    >
      <Ring pct={driver.winProbability} colour={colour} size={position === 0 ? 60 : 48} />

      <div
        className={`w-full mt-2 rounded-t-xl flex flex-col items-center justify-end pb-2 ${heights[position]}`}
        style={{ background: `linear-gradient(to top, ${colour}33, ${colour}11)`, border: `1px solid ${colour}44` }}
      >
        <span className="text-lg">{MEDAL[position]}</span>
        <p className="text-white text-xs font-f1heading font-black mt-0.5 text-center leading-tight px-1">
          {driver.driverCode}
        </p>
        <p className="text-gray-500 text-[9px] font-mono truncate px-1 max-w-full text-center">
          {driver.constructor}
        </p>
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const RacePrediction = ({ circuitId, circuitName, year }) => {
  const [type, setType]             = useState('race');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState(false); // show full list
  const prevKey                     = useRef('');

  useEffect(() => {
    if (!circuitId) return;
    const key = `${circuitId}:${year}:${type}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    setLoading(true);
    setError(null);
    setData(null);

    getF1Prediction(circuitId, year, type)
      .then(({ data: d }) => setData(d))
      .catch(() => setError('Prediction unavailable for this circuit'))
      .finally(() => setLoading(false));
  }, [circuitId, year, type]);

  const predictions = data?.predictions || [];
  const top3        = predictions.slice(0, 3);
  const rest        = predictions.slice(3);
  const maxProb     = predictions[0]?.winProbability || 1;

  return (
    <div className="p-6 rounded-3xl bg-[#090b10] border border-white/10 shadow-xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <div>
            <h3 className="text-sm font-mono font-black text-white uppercase tracking-widest">
              AI Prediction Engine
            </h3>
            <p className="text-gray-600 text-[10px] font-mono mt-0.5">
              {circuitName} · {year} · {data?.totalRacesAtCircuit
                ? `${data.totalRacesAtCircuit} historical races analysed`
                : 'loading circuit history…'}
            </p>
          </div>
        </div>

        {/* Race / Qualifying toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10">
          {['race', 'qualifying'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                type === t ? 'bg-f1red text-white shadow-md' : 'text-gray-500 hover:text-white'
              }`}>
              {t === 'race' ? '🏁 Race' : '⏱ Qualifying'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-f1red border-t-transparent animate-spin" />
          <span className="text-gray-500 text-xs font-mono">Crunching historical data…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-8 text-gray-600 text-sm font-mono">{error}</div>
      )}

      {/* Content */}
      {!loading && !error && predictions.length > 0 && (
        <>
          {/* ── Podium visual ── */}
          <div className="flex items-end justify-center gap-3 pt-2">
            {/* P2 left, P1 centre, P3 right */}
            <PodiumCard driver={top3[1] || top3[0]} position={1} />
            <PodiumCard driver={top3[0]} position={0} />
            {top3[2] && <PodiumCard driver={top3[2]} position={2} />}
          </div>

          {/* ── Top-10 ranked list ── */}
          <div className="space-y-2 pt-1">
            <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">
              Full prediction · Win probability
            </p>

            {(expanded ? predictions : predictions.slice(0, 5)).map((d, i) => {
              const colour = teamColour(d.constructorId);
              const barW   = (d.winProbability / maxProb) * 100;
              return (
                <motion.div key={d.driverId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative rounded-xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${colour}22` }}
                >
                  {/* Subtle background fill proportional to probability */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(to right, ${colour}08, transparent 60%)` }} />

                  <div className="relative flex items-center gap-3 px-3 py-2.5">
                    {/* Rank */}
                    <span className="w-5 text-center font-mono font-black text-xs shrink-0"
                      style={{ color: i < 3 ? colour : '#555' }}>
                      {i < 3 ? MEDAL[i] : `P${i + 1}`}
                    </span>

                    {/* Colour strip */}
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: colour }} />

                    {/* Driver info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-white text-xs font-f1heading font-black leading-tight">
                            {d.name}
                          </p>
                          <p className="text-[10px] font-mono truncate" style={{ color: colour }}>
                            {d.constructor}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white text-sm font-f1heading font-black tabular-nums">
                            {d.winProbability.toFixed(1)}%
                          </p>
                          <p className="text-gray-600 text-[9px] font-mono">WIN PROB</p>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="mt-1.5">
                        <ProbBar value={barW} colour={colour} delay={i * 40 + 200} />
                      </div>
                    </div>
                  </div>

                  {/* Hover tooltip: reason */}
                  <div className="px-3 pb-0 max-h-0 overflow-hidden group-hover:max-h-12 group-hover:pb-2 transition-all duration-300">
                    <p className="text-gray-500 text-[10px] font-mono leading-relaxed">{d.reason}</p>
                  </div>
                </motion.div>
              );
            })}

            {/* Show more / less */}
            {predictions.length > 5 && (
              <button onClick={() => setExpanded(e => !e)}
                className="w-full py-1.5 rounded-xl text-[11px] font-mono font-bold text-gray-500 hover:text-white bg-white/3 hover:bg-white/8 border border-white/8 transition-all">
                {expanded ? '▲ Show less' : `▼ Show all ${predictions.length} drivers`}
              </button>
            )}
          </div>

          {/* ── Disclaimer ── */}
          <p className="text-gray-700 text-[9px] font-mono leading-relaxed pt-1">
            Predictions are generated by a statistical model weighting circuit history, current season form,
            recent race results, and championship points. For entertainment purposes only.
            Probabilities generated at {new Date(data.generatedAt).toLocaleTimeString()}.
          </p>
        </>
      )}
    </div>
  );
};

export default RacePrediction;
