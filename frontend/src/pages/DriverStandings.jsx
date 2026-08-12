import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getF1DriverStandings, getF1AllSeasons, getF1NextRace, getF1LastRaceResults } from '../services/api';
import toast from 'react-hot-toast';
import AnimatedLeaderboard from '../components/AnimatedLeaderboard';
import TrophyReveal from '../components/TrophyReveal';

// Team colour map for known constructors
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

const getTeamColour = (constructorId) =>
  TEAM_COLOURS[constructorId?.toLowerCase()] || '#E10600';

// Map Ergast driver data → shape AnimatedLeaderboard expects
const mapDriver = (d) => ({
  _id:         d.driverId,
  name:        `${d.firstName} ${d.lastName}`,
  nationality: d.nationality,
  number:      d.number,
  imageUrl:    null,
  team:        { name: typeof d.constructor === 'string' ? d.constructor : (d.constructorName || ''), _id: d.constructorId },
  teamColour:  getTeamColour(d.constructorId),
  points:      d.points,
  wins:        d.wins,
  podiums:     null,       // not in standings response
  code:        d.code,
});

const DriverStandings = () => {
  const [drivers, setDrivers]       = useState([]);
  const [seasons, setSeasons]       = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear());
  const [loading, setLoading]       = useState(true);
  const [showTrophy, setShowTrophy] = useState(false);
  const [nextRace, setNextRace]     = useState(null);
  const [lastRace, setLastRace]     = useState(null);
  const [dataSource, setDataSource] = useState('live'); // 'live' | 'loading'

  // Load season list from Ergast (all F1 seasons)
  useEffect(() => {
    getF1AllSeasons()
      .then(({ data }) => {
        setSeasons(data);
        // Default to current year, but only if present in list
        const year = new Date().getFullYear();
        setSelectedSeason(data.includes(year) ? year : data[0]);
      })
      .catch(() => {
        // Fallback: generate last 5 years
        const year = new Date().getFullYear();
        setSeasons([year, year - 1, year - 2, year - 3, year - 4]);
        toast.error('Could not load season list');
      });
  }, []);

  // Load next race and last race info
  useEffect(() => {
    getF1NextRace().then(({ data }) => setNextRace(data)).catch(() => {});
    getF1LastRaceResults().then(({ data }) => setLastRace(data)).catch(() => {});
  }, []);

  // Load standings when season changes
  const fetchStandings = useCallback(async () => {
    if (!selectedSeason) return;
    setLoading(true);
    setShowTrophy(false);
    setDrivers([]);
    setDataSource('loading');
    try {
      const { data } = await getF1DriverStandings(selectedSeason);
      const mapped = data.map(mapDriver);
      setDrivers(mapped);
      setDataSource('live');

      // Automatically show 3D Trophy popup ONLY for completed past seasons (not the current ongoing year)
      const currentYear = new Date().getFullYear();
      if (Number(selectedSeason) < currentYear && mapped.length > 0) {
        setTimeout(() => setShowTrophy(true), 600);
      }
    } catch (err) {
      toast.error('Failed to fetch live standings');
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  }, [selectedSeason]);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  return (
    <div className="max-w-7xl mx-auto">
      {showTrophy && drivers[0] && (
        <TrophyReveal
          championName={drivers[0].name}
          points={drivers[0].points}
          wins={drivers[0].wins}
          team={drivers[0].team?.name || ''}
          season={selectedSeason}
          onClose={() => setShowTrophy(false)}
        />
      )}

      {/* Header */}
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
              <span className="text-f1red">Driver</span> Championship
            </h1>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(0,200,100,0.12)', color: '#00c864', border: '1px solid rgba(0,200,100,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              OFFICIAL DATA · ERGAST
            </span>
          </div>
        </div>

        {/* Season selector */}
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

      {/* Next race + last race context cards */}
      <AnimatePresence>
        {(nextRace || lastRace) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            {nextRace && (
              <div className="glass rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Next Race</p>
                <p className="font-f1heading font-bold text-lg text-white">{nextRace.name}</p>
                <p className="text-sm text-gray-400">{nextRace.circuitName} · {nextRace.country}</p>
                <p className="text-sm text-f1red font-bold mt-1">
                  {new Date(nextRace.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
            {lastRace && (
              <div className="glass rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Last Race Winner</p>
                <p className="font-f1heading font-bold text-lg text-white">{lastRace.name}</p>
                {lastRace.results?.[0] && (
                  <p className="text-sm text-gray-400">
                    🏆 {lastRace.results[0].driver.firstName} {lastRace.results[0].driver.lastName}
                    <span className="text-gray-600"> · {lastRace.results[0].constructor}</span>
                  </p>
                )}
                {lastRace.results?.[0]?.time && (
                  <p className="text-sm text-f1red font-bold mt-1">{lastRace.results[0].time}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standings */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">No data available for {selectedSeason}</p>
          <p className="text-gray-600 text-sm mt-2">Season may not have started yet</p>
        </div>
      ) : (
        <AnimatedLeaderboard key={selectedSeason} drivers={drivers} />
      )}
    </div>
  );
};

export default DriverStandings;
