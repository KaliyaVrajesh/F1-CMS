import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRaces } from '../services/api';
import toast from 'react-hot-toast';
import CircuitSVG from '../components/CircuitSVG';
import F1Globe from '../components/F1Globe';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FLAG = {
  monaco: '🇲🇨', 'united kingdom': '🇬🇧', uk: '🇬🇧', britain: '🇬🇧',
  italy: '🇮🇹', belgium: '🇧🇪', japan: '🇯🇵', brazil: '🇧🇷',
  spain: '🇪🇸', austria: '🇦🇹', bahrain: '🇧🇭',
  'united arab emirates': '🇦🇪', uae: '🇦🇪',
  'united states': '🇺🇸', usa: '🇺🇸',
  singapore: '🇸🇬', australia: '🇦🇺', canada: '🇨🇦',
  france: '🇫🇷', germany: '🇩🇪', hungary: '🇭🇺',
  netherlands: '🇳🇱', mexico: '🇲🇽', azerbaijan: '🇦🇿',
  'saudi arabia': '🇸🇦', qatar: '🇶🇦', china: '🇨🇳',
  russia: '🇷🇺',
};
const getFlag = (c) => FLAG[(c || '').toLowerCase()] || '🏁';

// ─── Floating detail card (hover / click) ─────────────────────────────────────
const DetailCard = ({ race, isPinned, onPin, onClose }) => (
  <motion.div
    key={race._id}
    initial={{ opacity: 0, scale: 0.92, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.92, y: 10 }}
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    className="rounded-2xl overflow-hidden select-none"
    style={{
      background: 'rgba(8,8,10,0.96)',
      border: `1px solid ${isPinned ? 'rgba(225,6,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
      boxShadow: isPinned
        ? '0 0 40px rgba(225,6,0,0.15), 0 20px 60px rgba(0,0,0,0.7)'
        : '0 20px 60px rgba(0,0,0,0.6)',
      width: '300px',
      backdropFilter: 'blur(20px)',
    }}
  >
    {/* Header */}
    <div className="px-4 py-3 flex items-start justify-between"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">{getFlag(race.circuitCountry)}</span>
          <span className="text-f1red text-xs font-bold uppercase tracking-widest truncate">
            {race.circuitCountry || 'Grand Prix'}
          </span>
        </div>
        <h3 className="font-f1heading font-black text-white text-base uppercase leading-tight truncate">
          {race.name}
        </h3>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{race.circuit}</p>
      </div>
      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
        {/* Pin / unpin */}
        <button
          onClick={onPin}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
          style={{
            background: isPinned ? 'rgba(225,6,0,0.2)' : 'rgba(255,255,255,0.06)',
            color: isPinned ? '#E10600' : '#666',
          }}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          📌
        </button>
        {isPinned && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-gray-600 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', fontSize: '10px' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>

    {/* Circuit SVG */}
    <div className="flex items-center justify-center px-5 py-4"
      style={{ height: '160px', background: 'rgba(0,0,0,0.3)' }}>
      <CircuitSVG
        circuitName={race.circuit || race.name}
        animate={true}
        className="w-full h-full"
      />
    </div>

    {/* Stats */}
    <div className="px-4 py-3 grid grid-cols-2 gap-2">
      {[
        { label: 'Date',   value: race.date ? new Date(race.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
        { label: 'Season', value: race.season?.year || '—' },
        { label: 'City',   value: race.circuitCity || '—' },
        { label: 'Round',  value: race.round ? `Round ${race.round}` : '—' },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-white text-xs font-semibold truncate">{value}</p>
        </div>
      ))}
    </div>

    {/* Top 3 */}
    {race.results?.length > 0 && (
      <div className="px-4 pb-4">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Podium</p>
        <div className="space-y-1">
          {race.results.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-1.5"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-xs font-black w-4 text-center"
                style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }}>
                {i + 1}
              </span>
              <span className="text-white text-xs font-semibold flex-1 truncate">
                {r.driver?.name || r.driverName || '—'}
              </span>
              <span className="text-gray-600 text-xs truncate">
                {r.constructor?.name || r.constructorName || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

// ─── Starfield ────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 150 }, () => ({
  size:    Math.random() < 0.75 ? '1px' : '2px',
  top:     `${Math.random() * 100}%`,
  left:    `${Math.random() * 100}%`,
  opacity: Math.random() * 0.5 + 0.1,
  delay:   Math.random() * 3,
}));

// ─── Main Page ────────────────────────────────────────────────────────────────
const CircuitsMap = () => {
  const [races, setRaces]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [season, setSeason]         = useState('');
  const [seasons, setSeasons]       = useState([]);
  const [visibleCount, setVisible]  = useState(0);
  const [pinnedRace, setPinned]     = useState(null);   // clicked = pinned
  const [hoveredRace, setHovered]   = useState(null);   // hover preview
  const revealTimer                 = useRef(null);

  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      const { data } = await getRaces();
      setRaces(data);
      const yrs = [...new Set(data.map(r => r.season?.year).filter(Boolean))].sort((a, b) => b - a);
      setSeasons(yrs);
      if (yrs.length > 0) {
        setSeason(String(yrs[0]));
      }
    } catch {
      toast.error('Failed to fetch races');
    } finally {
      setLoading(false);
    }
  };

  // Filtered races for selected season (only those with coords)
  const filteredRaces = races.filter(r =>
    r.latitude != null && r.longitude != null &&
    (!season || String(r.season?.year) === season)
  );

  // Staggered reveal when season changes
  useEffect(() => {
    if (!season) return;
    setVisible(0);
    setPinned(null);
    setHovered(null);

    if (revealTimer.current) clearInterval(revealTimer.current);

    const total = filteredRaces.length;
    if (total === 0) return;

    // Reveal all dots within 900ms
    const interval = Math.min(900 / total, 80);
    let count = 0;

    revealTimer.current = setInterval(() => {
      count++;
      setVisible(count);
      if (count >= total) clearInterval(revealTimer.current);
    }, interval);

    return () => clearInterval(revealTimer.current);
  }, [season, races]);

  // The card to show: pinned takes priority over hovered
  const activeRace = pinnedRace || hoveredRace;

  const handleSelect = (race) => {
    setPinned(prev => prev?._id === race._id ? null : race);
  };

  const handleHoverChange = (race) => {
    if (!pinnedRace) setHovered(race);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#020408' }}>
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-f1red text-xs font-bold">F1</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        top: '64px', // below navbar
        background: 'radial-gradient(ellipse at 40% 50%, #0a1628 0%, #020408 65%)',
      }}
    >
      {/* Starfield */}
      <div className="absolute inset-0 pointer-events-none">
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ width: s.size, height: s.size, top: s.top, left: s.left, opacity: s.opacity }} />
        ))}
      </div>

      {/* Globe — fills the whole area */}
      <div className="absolute inset-0">
        <F1Globe
          races={filteredRaces}
          visibleCount={visibleCount}
          selectedId={pinnedRace?._id}
          onSelect={handleSelect}
          onHoverChange={handleHoverChange}
        />
      </div>

      {/* ── Top-right: Season selector + counter ── */}
      <div className="absolute top-4 right-6 z-20 flex items-center gap-3">
        {/* Dot counter */}
        <AnimatePresence mode="wait">
          {season && (
            <motion.div
              key={season}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-right"
            >
              <p className="text-gray-500 text-xs uppercase tracking-widest">
                {visibleCount} / {filteredRaces.length} circuits
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Season dropdown */}
        <div className="relative">
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl text-sm font-bold text-white outline-none cursor-pointer transition-all"
            style={{
              background: 'rgba(10,10,15,0.85)',
              border: '1px solid rgba(225,6,0,0.4)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <option value="" disabled>Select Season</option>
            {seasons.map(y => (
              <option key={y} value={y} style={{ background: '#0a0a0f' }}>
                {y} Season
              </option>
            ))}
          </select>
          {/* Dropdown arrow */}
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-f1red text-xs pointer-events-none">▼</span>
        </div>
      </div>

      {/* ── Top-left: Title ── */}
      <div className="absolute top-4 left-6 z-20 pointer-events-none">
        <p className="text-f1red text-xs font-bold uppercase tracking-[0.3em] mb-0.5">Formula 1</p>
        <h1 className="font-f1heading font-black text-white text-2xl uppercase leading-none">
          World <span className="text-f1red">Circuits</span>
        </h1>
      </div>

      {/* ── Bottom hint ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <p className="text-gray-700 text-xs uppercase tracking-widest text-center">
          Drag · Scroll to zoom · Hover or click a dot
        </p>
      </div>

      {/* ── Floating detail card ── */}
      <div className="absolute bottom-16 right-6 z-30" style={{ pointerEvents: activeRace ? 'auto' : 'none' }}>
        <AnimatePresence mode="wait">
          {activeRace && (
            <DetailCard
              key={activeRace._id}
              race={activeRace}
              isPinned={pinnedRace?._id === activeRace._id}
              onPin={() => handleSelect(activeRace)}
              onClose={() => { setPinned(null); setHovered(null); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CircuitsMap;
