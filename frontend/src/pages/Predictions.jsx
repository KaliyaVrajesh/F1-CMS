import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getF1Prediction, getF1SeasonCircuits } from '../services/api';
import toast from 'react-hot-toast';
import SEOHead from '../components/SEOHead';

// Team colors
const TEAM_COLORS = {
  red_bull: '#3671C6',
  ferrari: '#E8002D',
  mercedes: '#27F4D2',
  mclaren: '#FF8000',
  aston_martin: '#229971',
  alpine: '#FF87BC',
  williams: '#64C4FF',
  alphatauri: '#5E8FAA',
  alfa: '#C92D4B',
  haas: '#B6BABD',
  racing_point: '#F596C8',
  renault: '#FFF500',
  sauber: '#52E252',
  kick_sauber: '#52E252',
  rb: '#6692FF',
};

const getTeamColor = (constructorId) => {
  const key = constructorId?.toLowerCase().replace(/[-\s]/g, '_');
  return TEAM_COLORS[key] || '#888';
};

const ConfidenceBadge = ({ probability }) => {
  let color, text;
  if (probability >= 40)      { color = '#00D9FF'; text = 'Strong Favorite'; }
  else if (probability >= 25) { color = '#00FF88'; text = 'Contender'; }
  else if (probability >= 15) { color = '#FFD700'; text = 'Dark Horse'; }
  else if (probability >= 5)  { color = '#FF8800'; text = 'Outsider'; }
  else                         { color = '#888';    text = 'Long Shot'; }

  return (
    <div
      className="px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {text}
    </div>
  );
};

const PredictionCard = ({ prediction, index, type }) => {
  const teamColor = getTeamColor(prediction.constructorId);
  const isTop3 = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="glass rounded-xl p-5 hover:border-f1red/50 transition-all duration-300"
      style={{
        border: isTop3 ? `2px solid ${teamColor}66` : '1px solid rgba(255,255,255,0.1)',
        boxShadow: isTop3 ? `0 8px 32px ${teamColor}22` : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: rank + driver info */}
        <div className="flex items-start gap-4 flex-1">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl font-f1heading font-black text-2xl shrink-0"
            style={{
              background: isTop3
                ? `linear-gradient(135deg, ${teamColor}33, ${teamColor}11)`
                : 'rgba(255,255,255,0.05)',
              color: isTop3 ? teamColor : '#666',
              border: `2px solid ${isTop3 ? teamColor : '#333'}`,
            }}
          >
            {prediction.rank}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-f1heading font-black text-xl text-white">{prediction.name}</h3>
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ background: `${teamColor}33`, color: teamColor }}
              >
                {prediction.driverCode}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-400">{prediction.constructor}</span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">P{prediction.championship} in Championship</span>
            </div>

            <div className="flex flex-wrap gap-3 mb-3">
              {prediction.circuitWins > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-yellow-400">🏆</span>
                  <span className="text-gray-300">
                    {prediction.circuitWins} circuit win{prediction.circuitWins > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {prediction.circuitPodiums > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400">🏁</span>
                  <span className="text-gray-300">
                    {prediction.circuitPodiums} podium{prediction.circuitPodiums > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {prediction.seasonWins > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-f1red">⚡</span>
                  <span className="text-gray-300">
                    {prediction.seasonWins} win{prediction.seasonWins > 1 ? 's' : ''} this year
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed">{prediction.reason}</p>
          </div>
        </div>

        {/* Right: probability */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <div className="font-f1heading font-black text-4xl mb-1" style={{ color: teamColor }}>
              {prediction.winProbability}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              {type === 'qualifying' ? 'Pole Chance' : 'Win Chance'}
            </div>
          </div>

          {isTop3 && (
            <div className="text-right">
              <div className="text-lg font-bold text-gray-300">
                {prediction.podiumProbability.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wider">Podium</div>
            </div>
          )}

          <ConfidenceBadge probability={prediction.winProbability} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${prediction.winProbability}%` }}
          transition={{ delay: index * 0.05 + 0.3, duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${teamColor}, ${teamColor}88)` }}
        />
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Predictions = () => {
  const currentYear = new Date().getFullYear();

  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [type, setType]                   = useState('race');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCircuitName, setSelectedCircuitName] = useState('');
  const [predYear, setPredYear]           = useState(currentYear);
  const [circuits, setCircuits]           = useState([]);

  // ── Load upcoming races from F1 API ────────────────────────────────────────
  // Uses /api/f1/circuits/season/:year — backend returns a plain array:
  // [{ round, name, circuitId, circuitName, locality, country, date, ... }]
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

        // Keep only races that haven't happened yet
        const upcoming = all.filter(r => new Date(r.date) >= now);

        if (upcoming.length > 0) {
          setCircuits(upcoming);
          setSelectedCircuit(upcoming[0].circuitId);
          setSelectedCircuitName(upcoming[0].circuitName);
        } else if (all.length > 0) {
          // Season is over or all races passed — show all so user can browse
          // (prediction model still works for historical comparison)
          setCircuits(all);
          setSelectedCircuit(all[all.length - 1].circuitId);
          setSelectedCircuitName(all[all.length - 1].circuitName);
        } else {
          setCircuits([]);
        }
      } catch (err) {
        console.error('Schedule load error:', err);
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

    const fetch = async () => {
      setLoading(true);
      setPredictions(null);
      try {
        // predYear is for standings lookup; circuit history comes from all time
        const { data } = await getF1Prediction(selectedCircuit, predYear, type);
        setPredictions(data);
      } catch (err) {
        console.error('Prediction error:', err);
        toast.error(
          err.response?.data?.message ||
          'Prediction failed — circuit may lack historical data.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [selectedCircuit, type, predYear]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 md:px-8">
      <SEOHead
        title="Race Predictions"
        description="AI-powered Formula 1 race predictions based on historical data, current form & circuit analysis."
        canonicalPath="/predictions"
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="text-4xl">🔮</div>
          <div>
            <h1 className="font-f1heading font-black text-4xl md:text-5xl uppercase">
              <span className="text-f1red">Race</span>{' '}
              <span className="text-white">Predictions</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              AI-powered statistical forecasting using historical data, current form &amp; circuit analysis
            </p>
          </div>
        </div>
      </motion.div>

      {/* Controls card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-7xl mx-auto mb-6"
      >
        <div className="glass rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Circuit selector */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Select Circuit
              </label>
              <select
                value={selectedCircuit}
                onChange={(e) => {
                  const c = circuits.find(x => x.circuitId === e.target.value);
                  setSelectedCircuit(e.target.value);
                  if (c) setSelectedCircuitName(c.circuitName);
                }}
                disabled={loadingSchedule || circuits.length === 0}
                className="w-full px-4 py-2.5 bg-dark-800 border border-gray-700 rounded-lg text-white text-sm
                           focus:outline-none focus:border-f1red transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSchedule ? (
                  <option value="">Loading schedule…</option>
                ) : circuits.length === 0 ? (
                  <option value="">No upcoming races in {predYear}</option>
                ) : (
                  circuits.map(c => (
                    <option key={c.circuitId} value={c.circuitId}>
                      {c.name}{' '}
                      ({new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Year selector */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Season
              </label>
              <select
                value={predYear}
                onChange={(e) => setPredYear(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 bg-dark-800 border border-gray-700 rounded-lg text-white text-sm
                           focus:outline-none focus:border-f1red transition"
              >
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Prediction type */}
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
                      type === t
                        ? 'bg-f1red text-white'
                        : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                    }`}
                  >
                    {t === 'race' ? '🏁 Race' : '⚡ Qualifying'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info banner — shown after prediction loads */}
          {predictions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-lg bg-gradient-to-r from-f1red/20 to-transparent border border-f1red/30"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📊</div>
                <div className="text-sm text-gray-300">
                  Analysis based on{' '}
                  <strong>{predictions.totalRacesAtCircuit}</strong> historical races at{' '}
                  <strong>{selectedCircuitName || selectedCircuit}</strong> · Generated{' '}
                  {new Date(predictions.generatedAt).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Predictions list */}
      <div className="max-w-7xl mx-auto">
        {loadingSchedule ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-f1red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading race schedule…</p>
            </div>
          </div>

        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-f1red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Analysing data &amp; computing probabilities…</p>
            </div>
          </div>

        ) : predictions?.predictions?.length > 0 ? (
          <div className="space-y-4">
            {/* Top 3 */}
            <div className="mb-8">
              <h2 className="font-f1heading font-black text-2xl text-white mb-4 flex items-center gap-2">
                <span className="text-f1red">🏆</span> Top Contenders
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {predictions.predictions.slice(0, 3).map((pred, i) => (
                  <PredictionCard key={pred.driverId} prediction={pred} index={i} type={type} />
                ))}
              </div>
            </div>

            {/* Rest of field */}
            {predictions.predictions.length > 3 && (
              <div>
                <h2 className="font-f1heading font-black text-2xl text-white mb-4 flex items-center gap-2">
                  <span className="text-gray-600">📋</span> Full Field
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {predictions.predictions.slice(3).map((pred, i) => (
                    <PredictionCard key={pred.driverId} prediction={pred} index={i + 3} type={type} />
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏎️</div>
            <p className="text-gray-400">
              {circuits.length === 0
                ? `No upcoming races found in ${predYear}. Try a different year.`
                : 'Select a circuit to view predictions'}
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="max-w-7xl mx-auto mt-12 text-center text-xs text-gray-600"
      >
        <p>
          Predictions are statistical models based on historical performance, circuit data, and current season form.
          Actual race results may vary due to weather, mechanical issues, strategy, and on-track incidents.
        </p>
      </motion.div>
    </div>
  );
};

export default Predictions;
