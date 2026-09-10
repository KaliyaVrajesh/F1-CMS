import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { getF1Prediction, getF1SeasonCircuits } from '../services/api';
import toast from 'react-hot-toast';
import SEOHead from '../components/SEOHead';

// ── Team colours ──────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  red_bull:      '#3671C6',
  ferrari:       '#E8002D',
  mercedes:      '#27F4D2',
  mclaren:       '#FF8000',
  aston_martin:  '#229971',
  alpine:        '#FF87BC',
  williams:      '#64C4FF',
  alphatauri:    '#5E8FAA',
  alfa:          '#C92D4B',
  haas:          '#B6BABD',
  racing_point:  '#F596C8',
  renault:       '#FFF500',
  sauber:        '#52E252',
  kick_sauber:   '#52E252',
  rb:            '#6692FF',
};

const getTeamColor = (cid) =>
  TEAM_COLORS[cid?.toLowerCase().replace(/[-\s]/g, '_')] || '#888';

// ── Factor labels/colours for charts ─────────────────────────────────────────
const FACTOR_META = {
  constructorPace: { label: 'Car Pace',        color: '#E8002D', weight: 22 },
  recentForm:      { label: 'Recent Form',     color: '#FF8000', weight: 20 },
  championship:    { label: 'Championship',    color: '#27F4D2', weight: 18 },
  circuitHistory:  { label: 'Circuit History', color: '#FFD700', weight: 15 },
  constructorForm: { label: 'Team Form',       color: '#229971', weight: 12 },
  circuitPodiums:  { label: 'Circuit Podiums', color: '#FF87BC', weight:  8 },
  seasonWins:      { label: 'Season Wins',     color: '#64C4FF', weight:  5 },
};

// ── Confidence badge ──────────────────────────────────────────────────────────
const ConfidenceBadge = ({ probability }) => {
  let color, text;
  if      (probability >= 35) { color = '#00D9FF'; text = 'Strong Favourite'; }
  else if (probability >= 20) { color = '#00FF88'; text = 'Contender'; }
  else if (probability >= 10) { color = '#FFD700'; text = 'Dark Horse'; }
  else if (probability >= 4)  { color = '#FF8800'; text = 'Outsider'; }
  else                         { color = '#888';    text = 'Long Shot'; }
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {text}
    </span>
  );
};

// ── Radar chart for a single driver's factor breakdown ─────────────────────
const DriverRadar = ({ factorScores, teamColor }) => {
  if (!factorScores) return null;
  const data = Object.entries(FACTOR_META).map(([key, meta]) => ({
    factor: meta.label,
    score:  factorScores[key] ?? 0,
    fullMark: 10,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#333" />
        <PolarAngleAxis dataKey="factor" tick={{ fill: '#999', fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="score"
          stroke={teamColor}
          fill={teamColor}
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// ── Expanded driver detail card ───────────────────────────────────────────────
const DriverDetail = ({ prediction, type }) => {
  const teamColor = getTeamColor(prediction.constructorId);

  const barData = Object.entries(FACTOR_META).map(([key, meta]) => ({
    name:   meta.label,
    score:  prediction.factorScores?.[key] ?? 0,
    weight: meta.weight,
    color:  meta.color,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Radar */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Factor Radar
          </p>
          <DriverRadar factorScores={prediction.factorScores} teamColor={teamColor} />
        </div>

        {/* Factor bars */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Score Breakdown (out of 10)
          </p>
          <div className="space-y-2">
            {barData.map(b => (
              <div key={b.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{b.name}</span>
                  <span className="font-bold" style={{ color: b.color }}>
                    {b.score.toFixed(1)} <span className="text-gray-600 font-normal">/ 10</span>
                    <span className="ml-1 text-gray-600">({b.weight}%)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.score * 10}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Circuit Wins',       value: prediction.circuitWins },
            { label: 'Circuit Podiums',    value: prediction.circuitPodiums },
            { label: 'Circuit Races',      value: prediction.circuitAppearances },
            { label: 'Recent Form Score',  value: prediction.recentFormScore?.toFixed(1) },
            { label: 'Season Points',      value: prediction.seasonPoints },
            { label: 'Season Wins',        value: prediction.seasonWins },
            { label: 'Team Points',        value: prediction.constructorPoints },
            { label: 'Team P',             value: `P${prediction.constructorPosition}` },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-lg p-3 text-center"
              style={{ background: `${teamColor}11`, border: `1px solid ${teamColor}33` }}
            >
              <div className="font-f1heading font-black text-xl text-white">{s.value ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ── Main prediction card ───────────────────────────────────────────────────────
const PredictionCard = ({ prediction, index, type }) => {
  const [expanded, setExpanded] = useState(false);
  const teamColor = getTeamColor(prediction.constructorId);
  const isTop3    = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.35 }}
      className="glass rounded-xl p-5 transition-all duration-300 cursor-pointer"
      style={{
        border:     isTop3 ? `2px solid ${teamColor}66` : '1px solid rgba(255,255,255,0.08)',
        boxShadow:  isTop3 ? `0 8px 32px ${teamColor}20` : 'none',
      }}
      onClick={() => setExpanded(x => !x)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Rank + driver */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl font-f1heading font-black text-2xl shrink-0"
            style={{
              background: isTop3
                ? `linear-gradient(135deg,${teamColor}33,${teamColor}11)`
                : 'rgba(255,255,255,0.05)',
              color:  isTop3 ? teamColor : '#555',
              border: `2px solid ${isTop3 ? teamColor : '#2a2a2a'}`,
            }}
          >
            {prediction.rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-f1heading font-black text-lg text-white leading-tight">
                {prediction.name}
              </h3>
              <span
                className="px-2 py-0.5 rounded text-xs font-bold shrink-0"
                style={{ background: `${teamColor}33`, color: teamColor }}
              >
                {prediction.driverCode}
              </span>
              <ConfidenceBadge probability={prediction.winProbability} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-2">
              <span>{prediction.constructor}</span>
              <span className="text-gray-700">·</span>
              <span>P{prediction.championship} championship</span>
              {prediction.circuitWins > 0 && (
                <>
                  <span className="text-gray-700">·</span>
                  <span className="text-yellow-400">🏆 {prediction.circuitWins}× winner here</span>
                </>
              )}
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-2">
              {prediction.reason}
            </p>

            {/* Mini factor bar (top 3 dominant factors) */}
            <div className="flex gap-1 mt-2">
              {Object.entries(FACTOR_META)
                .sort((a, b) =>
                  (prediction.factorScores?.[b[0]] ?? 0) -
                  (prediction.factorScores?.[a[0]] ?? 0)
                )
                .slice(0, 3)
                .map(([key, meta]) => (
                  <div
                    key={key}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                    title={`${meta.label}: ${prediction.factorScores?.[key]?.toFixed(1)}/10`}
                  >
                    {meta.label.split(' ')[0]}
                    {' '}
                    {prediction.factorScores?.[key]?.toFixed(1)}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Probability */}
        <div className="flex flex-col items-end gap-2 shrink-0 min-w-[90px]">
          <div className="text-right">
            <div
              className="font-f1heading font-black text-3xl leading-none"
              style={{ color: teamColor }}
            >
              {prediction.winProbability}%
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
              {type === 'qualifying' ? 'Pole chance' : 'Win chance'}
            </div>
          </div>

          {isTop3 && (
            <div className="text-right">
              <div className="text-sm font-bold text-gray-300">
                {prediction.podiumProbability.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Podium</div>
            </div>
          )}

          <div className="text-[10px] text-gray-600 flex items-center gap-1">
            {expanded ? '▲ less' : '▼ details'}
          </div>
        </div>
      </div>

      {/* Win probability bar */}
      <div className="mt-3 h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(prediction.winProbability / 45) * 100}%` }}
          transition={{ delay: Math.min(index * 0.04 + 0.2, 0.7), duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg,${teamColor},${teamColor}88)` }}
        />
      </div>

      {/* Expanded breakdown */}
      <AnimatePresence>
        {expanded && (
          <DriverDetail prediction={prediction} type={type} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Win probability pie chart (top 8) ────────────────────────────────────────
const WinProbPie = ({ predictions }) => {
  const top8 = predictions.slice(0, 8);
  const others = predictions.slice(8).reduce((s, d) => s + d.winProbability, 0);
  const data = [
    ...top8.map(d => ({
      name:  d.driverCode || d.name,
      value: d.winProbability,
      color: getTeamColor(d.constructorId),
    })),
    ...(others > 0 ? [{ name: 'Others', value: Math.round(others * 10) / 10, color: '#444' }] : []),
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value}%`, 'Win chance']}
          contentStyle={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: 8 }}
          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
          itemStyle={{ color: '#ccc' }}
        />
        <Legend
          formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ── Factor weights explainer bar chart ───────────────────────────────────────
const FactorWeightsChart = () => {
  const data = Object.entries(FACTOR_META).map(([, m]) => ({
    name:   m.label,
    weight: m.weight,
    color:  m.color,
  }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
        <XAxis type="number" domain={[0, 25]} tick={{ fill: '#666', fontSize: 10 }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#aaa', fontSize: 10 }} />
        <Tooltip
          formatter={(v) => [`${v}%`, 'Weight']}
          contentStyle={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: 8 }}
          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
          itemStyle={{ color: '#ccc' }}
        />
        <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── Top-N win-probability horizontal bar chart ────────────────────────────────
const ProbabilityBarChart = ({ predictions, type }) => {
  const top10 = predictions.slice(0, 10);
  const data  = top10.map(d => ({
    name:  d.driverCode || d.name.split(' ').pop(),
    prob:  d.winProbability,
    color: getTeamColor(d.constructorId),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
        <XAxis
          type="number"
          domain={[0, Math.max(...data.map(d => d.prob)) + 3]}
          tick={{ fill: '#666', fontSize: 10 }}
          tickFormatter={v => `${v}%`}
        />
        <YAxis type="category" dataKey="name" width={45} tick={{ fill: '#bbb', fontSize: 11, fontWeight: 'bold' }} />
        <Tooltip
          formatter={(v) => [`${v}%`, type === 'qualifying' ? 'Pole chance' : 'Win chance']}
          contentStyle={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: 8 }}
          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
          itemStyle={{ color: '#ccc' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar dataKey="prob" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#aaa', fontSize: 10, formatter: v => `${v}%` }}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const Predictions = () => {
  const currentYear = new Date().getFullYear();

  const [predictions, setPredictions]         = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [type, setType]                       = useState('race');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCircuitName, setSelectedCircuitName] = useState('');
  const [predYear, setPredYear]               = useState(currentYear);
  const [circuits, setCircuits]               = useState([]);
  const [activeTab, setActiveTab]             = useState('grid'); // 'grid' | 'charts'

  // ── Load season schedule ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingSchedule(true);
      setPredictions(null);
      setSelectedCircuit('');
      setCircuits([]);

      const now = new Date();
      try {
        const { data } = await getF1SeasonCircuits(predYear);
        const all = Array.isArray(data) ? data : [];
        const upcoming = all.filter(r => new Date(r.date) >= now);

        const list = upcoming.length > 0 ? upcoming : all;
        setCircuits(list);

        if (list.length > 0) {
          const first = upcoming.length > 0 ? list[0] : list[list.length - 1];
          setSelectedCircuit(first.circuitId);
          setSelectedCircuitName(first.circuitName);
        }
      } catch (err) {
        console.error('Schedule error:', err);
        toast.error('Failed to load race schedule');
      } finally {
        setLoadingSchedule(false);
      }
    };
    load();
  }, [predYear]);

  // ── Fetch prediction ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCircuit) return;
    const run = async () => {
      setLoading(true);
      setPredictions(null);
      try {
        const { data } = await getF1Prediction(selectedCircuit, predYear, type);
        setPredictions(data);
      } catch (err) {
        console.error('Prediction error:', err);
        toast.error(
          err.response?.data?.message ||
          'Prediction failed — this circuit may lack historical data.'
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedCircuit, type, predYear]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-20 pb-16 px-4 md:px-8">
      <SEOHead
        title="Race Predictions"
        description="AI-powered Formula 1 race predictions with data visualizations."
        canonicalPath="/predictions"
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="text-4xl">🔮</div>
          <div>
            <h1 className="font-f1heading font-black text-4xl md:text-5xl uppercase">
              <span className="text-f1red">Race</span>{' '}
              <span className="text-white">Predictions</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Statistical model across 7 weighted factors · Click any driver card to see their breakdown
            </p>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="max-w-7xl mx-auto mb-6"
      >
        <div className="glass rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Circuit */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Select Circuit
              </label>
              <select
                value={selectedCircuit}
                onChange={e => {
                  const c = circuits.find(x => x.circuitId === e.target.value);
                  setSelectedCircuit(e.target.value);
                  if (c) setSelectedCircuitName(c.circuitName);
                }}
                disabled={loadingSchedule || circuits.length === 0}
                className="w-full px-4 py-2.5 bg-dark-800 border border-gray-700 rounded-lg text-white text-sm
                           focus:outline-none focus:border-f1red transition disabled:opacity-50"
              >
                {loadingSchedule
                  ? <option>Loading schedule…</option>
                  : circuits.length === 0
                    ? <option>No races in {predYear}</option>
                    : circuits.map(c => (
                        <option key={c.circuitId} value={c.circuitId}>
                          {c.name} ({new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                        </option>
                      ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Season
              </label>
              <select
                value={predYear}
                onChange={e => setPredYear(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-dark-800 border border-gray-700 rounded-lg text-white text-sm
                           focus:outline-none focus:border-f1red transition"
              >
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Prediction Type
              </label>
              <div className="flex gap-2">
                {['race', 'qualifying'].map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition ${
                      type === t ? 'bg-f1red text-white' : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                    }`}
                  >
                    {t === 'race' ? '🏁 Race' : '⚡ Qualifying'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info banner */}
          {predictions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-gradient-to-r from-f1red/15 to-transparent border border-f1red/25 flex items-center gap-3 text-sm text-gray-300"
            >
              <span className="text-xl">📊</span>
              <span>
                Based on{' '}
                <strong className="text-white">{predictions.totalRacesAtCircuit}</strong> races at{' '}
                <strong className="text-white">{selectedCircuitName || selectedCircuit}</strong>
                {' '}· Model uses 7 factors · Probabilities are capped at 45% max per driver
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {loadingSchedule || loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-f1red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">
                {loadingSchedule ? 'Loading race schedule…' : 'Computing predictions…'}
              </p>
            </div>
          </div>

        ) : predictions?.predictions?.length > 0 ? (
          <>
            {/* ── Overview charts ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
            >
              {/* Win probability pie */}
              <div className="glass rounded-2xl p-5">
                <h2 className="font-f1heading font-black text-base text-white mb-1">
                  Win Probability Share
                </h2>
                <p className="text-xs text-gray-500 mb-3">Top 8 drivers · capped at 45%</p>
                <WinProbPie predictions={predictions.predictions} />
              </div>

              {/* Horizontal probability bar */}
              <div className="glass rounded-2xl p-5">
                <h2 className="font-f1heading font-black text-base text-white mb-1">
                  {type === 'qualifying' ? 'Pole Chance' : 'Win Chance'} — Top 10
                </h2>
                <p className="text-xs text-gray-500 mb-3">By percentage</p>
                <ProbabilityBarChart predictions={predictions.predictions} type={type} />
              </div>

              {/* Model weights explainer */}
              <div className="glass rounded-2xl p-5">
                <h2 className="font-f1heading font-black text-base text-white mb-1">
                  Model Factor Weights
                </h2>
                <p className="text-xs text-gray-500 mb-3">How the prediction is calculated</p>
                <FactorWeightsChart />
              </div>
            </motion.div>

            {/* ── View toggle ── */}
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-f1heading font-black text-2xl text-white flex-1">
                Driver Predictions
              </h2>
              <div className="flex bg-dark-800 rounded-lg p-1 gap-1">
                {[
                  { key: 'grid',   label: 'Grid View' },
                  { key: 'charts', label: 'Compare' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded text-sm font-bold transition ${
                      activeTab === tab.key
                        ? 'bg-f1red text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Grid view ── */}
            {activeTab === 'grid' && (
              <div className="space-y-3">
                {predictions.predictions.slice(0, 3).length > 0 && (
                  <>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      🏆 Top Contenders — Click to expand breakdown
                    </p>
                    {predictions.predictions.slice(0, 3).map((pred, i) => (
                      <PredictionCard key={pred.driverId} prediction={pred} index={i} type={type} />
                    ))}
                    {predictions.predictions.length > 3 && (
                      <>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-6 mb-2">
                          📋 Full Field
                        </p>
                        {predictions.predictions.slice(3).map((pred, i) => (
                          <PredictionCard key={pred.driverId} prediction={pred} index={i + 3} type={type} />
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Compare view ── */}
            {activeTab === 'charts' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Stacked radar for top 5 */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-f1heading font-black text-lg text-white mb-1">
                    Top 5 — Factor Comparison
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Each driver's score per factor (out of 10). Larger area = stronger all-round profile.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {predictions.predictions.slice(0, 5).map(pred => {
                      const tc = getTeamColor(pred.constructorId);
                      return (
                        <div key={pred.driverId} className="text-center">
                          <div
                            className="text-xs font-bold mb-1 truncate"
                            style={{ color: tc }}
                          >
                            P{pred.rank} {pred.driverCode}
                          </div>
                          <div className="text-[10px] text-gray-500 mb-2">{pred.winProbability}% win</div>
                          <DriverRadar factorScores={pred.factorScores} teamColor={tc} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Full factor breakdown table */}
                <div className="glass rounded-2xl p-6 overflow-x-auto">
                  <h3 className="font-f1heading font-black text-lg text-white mb-4">
                    Full Grid Factor Scores
                  </h3>
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 pr-3 text-gray-400 font-semibold">Driver</th>
                        <th className="text-left py-2 pr-3 text-gray-400 font-semibold">Team</th>
                        {Object.values(FACTOR_META).map(m => (
                          <th key={m.label} className="text-right py-2 px-2 text-gray-400 font-semibold whitespace-nowrap">
                            {m.label}
                          </th>
                        ))}
                        <th className="text-right py-2 pl-2 text-gray-400 font-semibold">Win %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.predictions.map((pred, i) => {
                        const tc = getTeamColor(pred.constructorId);
                        return (
                          <tr
                            key={pred.driverId}
                            className="border-b border-gray-800/50 hover:bg-white/5 transition"
                          >
                            <td className="py-2 pr-3 font-bold" style={{ color: tc }}>
                              P{pred.rank} {pred.driverCode}
                            </td>
                            <td className="py-2 pr-3 text-gray-400 whitespace-nowrap">
                              {pred.constructor}
                            </td>
                            {Object.keys(FACTOR_META).map(key => (
                              <td key={key} className="py-2 px-2 text-right">
                                <span
                                  className="inline-block w-10 text-center py-0.5 rounded text-[10px] font-bold"
                                  style={{
                                    background: `${FACTOR_META[key].color}22`,
                                    color: FACTOR_META[key].color,
                                  }}
                                >
                                  {(pred.factorScores?.[key] ?? 0).toFixed(1)}
                                </span>
                              </td>
                            ))}
                            <td className="py-2 pl-2 text-right font-f1heading font-black" style={{ color: tc }}>
                              {pred.winProbability}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>

        ) : (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🏎️</div>
            <p className="text-gray-400">
              {circuits.length === 0
                ? `No races found in ${predYear}. Try a different year.`
                : 'Select a circuit to view predictions'}
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto mt-12 text-center text-xs text-gray-600 leading-relaxed px-4">
        Predictions are a statistical model, not certainty. Probabilities are capped so no driver
        exceeds 45% (too many variables in F1). Always a minimum 0.3% per driver —
        F1 is unpredictable. Weather, reliability, safety cars and strategy are not modelled.
      </div>
    </div>
  );
};

export default Predictions;
