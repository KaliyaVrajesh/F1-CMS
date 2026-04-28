import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getConstructorStandings, getSeasons } from '../services/api';
import toast from 'react-hot-toast';
import AnimatedConstructorLeaderboard from '../components/AnimatedConstructorLeaderboard';
import TrophyReveal from '../components/TrophyReveal';

const ConstructorStandings = () => {
  const [constructors, setConstructors] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [showTrophy, setShowTrophy] = useState(false);

  useEffect(() => { fetchSeasons(); }, []);
  useEffect(() => { if (selectedSeason) fetchStandings(); }, [selectedSeason]);

  const fetchSeasons = async () => {
    try {
      const { data } = await getSeasons();
      setSeasons(data);
      if (data.length > 0) setSelectedSeason(data[0].year);
    } catch {
      toast.error('Failed to fetch seasons');
    }
  };

  const fetchStandings = async () => {
    try {
      setLoading(true);
      setConstructors([]);
      setShowTrophy(false);
      const { data } = await getConstructorStandings(selectedSeason);
      setConstructors(data);
      if (data.length > 1 && data[0].points - data[1].points > 100) {
        setTimeout(() => setShowTrophy(true), 1000);
      }
    } catch {
      toast.error('Failed to fetch standings');
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-f1red">Constructor</span> Standings
        </h1>
        <div className="flex items-center space-x-4">
          <label className="text-gray-400">Season:</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
          >
            {seasons.map((s) => (
              <option key={s.year} value={s.year}>{s.year}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red" />
        </div>
      ) : constructors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">No constructors found for this season</p>
        </div>
      ) : (
        <AnimatedConstructorLeaderboard key={selectedSeason} constructors={constructors} />
      )}
    </div>
  );
};

export default ConstructorStandings;
