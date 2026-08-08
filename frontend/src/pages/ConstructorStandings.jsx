import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getF1ConstructorStandings, getF1AllSeasons } from '../services/api';
import toast from 'react-hot-toast';
import AnimatedConstructorLeaderboard from '../components/AnimatedConstructorLeaderboard';
import TrophyReveal from '../components/TrophyReveal';

const TEAM_COLOURS = {
  'red_bull':       '#3671C6',
  'ferrari':        '#E8002D',
  'mercedes':       '#27F4D2',
  'mclaren':        '#FF8000',
  'aston_martin':   '#229971',
  'alpine':         '#0093CC',
  'williams':       '#64C4FF',
  'rb':             '#6692FF',
  'kick_sauber':    '#52E252',
  'haas':           '#B6BABD',
};

const getTeamColour = (id) =>
  TEAM_COLOURS[id?.toLowerCase()] || '#E10600';

// Map Ergast constructor data → shape AnimatedConstructorLeaderboard expects
const mapConstructor = (c) => ({
  _id:     c.constructorId,
  name:    c.name,
  country: c.nationality,
  logoUrl: null,
  points:  c.points,
  wins:    c.wins,
  colour:  getTeamColour(c.constructorId),
  position: c.position,
});

const ConstructorStandings = () => {
  const [constructors, setConstructors] = useState([]);
  const [seasons, setSeasons]           = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear());
  const [loading, setLoading]           = useState(true);
  const [showTrophy, setShowTrophy]     = useState(false);

  // Load season list from Ergast
  useEffect(() => {
    getF1AllSeasons()
      .then(({ data }) => {
        setSeasons(data);
        const year = new Date().getFullYear();
        setSelectedSeason(data.includes(year) ? year : data[0]);
      })
      .catch(() => {
        const year = new Date().getFullYear();
        setSeasons([year, year - 1, year - 2, year - 3, year - 4]);
        toast.error('Could not load season list');
      });
  }, []);

  const fetchStandings = useCallback(async () => {
    if (!selectedSeason) return;
    setLoading(true);
    setShowTrophy(false);
    setConstructors([]);
    try {
      const { data } = await getF1ConstructorStandings(selectedSeason);
      const mapped = data.map(mapConstructor);
      setConstructors(mapped);
      if (mapped.length > 1 && mapped[0].points - mapped[1].points > 100) {
        setTimeout(() => setShowTrophy(true), 800);
      }
    } catch {
      toast.error('Failed to fetch live constructor standings');
    } finally {
      setLoading(false);
    }
  }, [selectedSeason]);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  return (
    <div className="max-w-7xl mx-auto">
      {showTrophy && constructors[0] && (
        <TrophyReveal championName={constructors[0].name} points={constructors[0].points} />
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-f1red font-bold tracking-[0.3em] text-xs uppercase mb-1">
              Formula 1 · {selectedSeason}
            </p>
            <h1 className="text-4xl font-black uppercase">
              <span className="text-f1red">Constructor</span> Championship
            </h1>
          </div>

          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(0,200,100,0.12)', color: '#00c864', border: '1px solid rgba(0,200,100,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            OFFICIAL DATA · ERGAST
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-gray-400 text-sm">Season:</label>
          <div className="flex gap-2 flex-wrap">
            {seasons.slice(0, 8).map(yr => (
              <button key={yr}
                onClick={() => setSelectedSeason(yr)}
                className="px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200"
                style={{
                  background: yr === selectedSeason ? '#E10600' : 'rgba(255,255,255,0.06)',
                  color: yr === selectedSeason ? '#fff' : '#888',
                  border: yr === selectedSeason ? '1px solid #E10600' : '1px solid rgba(255,255,255,0.1)',
                }}>
                {yr}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red" />
        </div>
      ) : constructors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">No data available for {selectedSeason}</p>
          <p className="text-gray-600 text-sm mt-2">Season may not have started yet</p>
        </div>
      ) : (
        <AnimatedConstructorLeaderboard key={selectedSeason} constructors={constructors} />
      )}
    </div>
  );
};

export default ConstructorStandings;
