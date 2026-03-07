import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getDriverStandings, getSeasons } from '../services/api';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import AnimatedLeaderboard from '../components/AnimatedLeaderboard';
import TrophyReveal from '../components/TrophyReveal';

const DriverStandings = () => {
  const [drivers, setDrivers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [showTrophy, setShowTrophy] = useState(false);
  const [useAnimatedLeaderboard, setUseAnimatedLeaderboard] = useState(true);
  const rowsRef = useRef([]);
  const pointsRef = useRef([]);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      fetchStandings();
    }
  }, [selectedSeason]);

  useEffect(() => {
    if (!loading && drivers.length > 0) {
      // Animate table rows
      gsap.from(rowsRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
      });

      // Animate points counter
      pointsRef.current.forEach((el, index) => {
        if (el) {
          const targetPoints = drivers[index].points;
          gsap.from(el, {
            textContent: 0,
            duration: 1.5,
            ease: 'power1.out',
            snap: { textContent: 1 },
            onUpdate: function () {
              el.textContent = Math.ceil(this.targets()[0].textContent);
            },
          });
        }
      });
    }
  }, [loading, drivers]);

  const fetchSeasons = async () => {
    try {
      const { data } = await getSeasons();
      setSeasons(data);
      if (data.length > 0) {
        setSelectedSeason(data[0].year);
      }
    } catch (error) {
      toast.error('Failed to fetch seasons');
    }
  };

  const fetchStandings = async () => {
    try {
      setLoading(true);
      const { data } = await getDriverStandings(selectedSeason);
      setDrivers(data);
      
      // Check if there's a clear champion (significant points lead)
      if (data.length > 1 && data[0].points - data[1].points > 25) {
        setTimeout(() => setShowTrophy(true), 1000);
      }
    } catch (error) {
      toast.error('Failed to fetch standings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {showTrophy && drivers[0] && (
        <TrophyReveal
          championName={drivers[0].name}
          points={drivers[0].points}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-f1red">Driver</span> Standings
        </h1>

        <div className="flex items-center space-x-4">
          <label className="text-gray-400">Season:</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
          >
            {seasons.map((season) => (
              <option key={season.year} value={season.year}>
                {season.year}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setUseAnimatedLeaderboard(!useAnimatedLeaderboard)}
            className="ml-auto px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-sm transition"
          >
            {useAnimatedLeaderboard ? 'Classic View' : 'Animated View'}
          </button>
        </div>
      </motion.div>

      {drivers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">No drivers found for this season</p>
        </div>
      ) : useAnimatedLeaderboard ? (
        <AnimatedLeaderboard drivers={drivers} />
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-6 py-4 text-left">Pos</th>
                <th className="px-6 py-4 text-left">Driver</th>
                <th className="px-6 py-4 text-left">Nationality</th>
                <th className="px-6 py-4 text-left">Team</th>
                <th className="px-6 py-4 text-center">Points</th>
                <th className="px-6 py-4 text-center">Wins</th>
                <th className="px-6 py-4 text-center">Podiums</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => (
                <tr
                  key={driver._id}
                  ref={(el) => (rowsRef.current[index] = el)}
                  className="border-t border-gray-800 hover:bg-dark-800 transition"
                >
                  <td className="px-6 py-4 font-bold">
                    {index === 0 && <span className="text-f1red">#{index + 1}</span>}
                    {index !== 0 && <span>#{index + 1}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {driver.imageUrl ? (
                        <img
                          src={driver.imageUrl}
                          alt={driver.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-f1red"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                          {driver.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold">{driver.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{driver.nationality}</td>
                  <td className="px-6 py-4 text-gray-400">{driver.team?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-center font-bold text-f1red">
                    <span ref={(el) => (pointsRef.current[index] = el)}>
                      {driver.points}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{driver.wins}</td>
                  <td className="px-6 py-4 text-center">{driver.podiums}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DriverStandings;
