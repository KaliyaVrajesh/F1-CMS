import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getConstructorStandings, getSeasons } from '../services/api';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const ConstructorStandings = () => {
  const [constructors, setConstructors] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
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
    if (!loading && constructors.length > 0) {
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
          const targetPoints = constructors[index].points;
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
  }, [loading, constructors]);

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
      const { data } = await getConstructorStandings(selectedSeason);
      setConstructors(data);
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
            {seasons.map((season) => (
              <option key={season.year} value={season.year}>
                {season.year}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {constructors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl">No constructors found for this season</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-6 py-4 text-left">Pos</th>
                <th className="px-6 py-4 text-left">Team</th>
                <th className="px-6 py-4 text-left">Country</th>
                <th className="px-6 py-4 text-center">Points</th>
              </tr>
            </thead>
            <tbody>
              {constructors.map((constructor, index) => (
                <tr
                  key={constructor._id}
                  ref={(el) => (rowsRef.current[index] = el)}
                  className="border-t border-gray-800 hover:bg-dark-800 transition"
                >
                  <td className="px-6 py-4 font-bold">
                    {index === 0 && <span className="text-f1red">#{index + 1}</span>}
                    {index !== 0 && <span>#{index + 1}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {constructor.logoUrl ? (
                        <img
                          src={constructor.logoUrl}
                          alt={constructor.name}
                          className="w-12 h-8 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-8 bg-gray-700 flex items-center justify-center text-xs font-bold rounded">
                          {constructor.name.substring(0, 3).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold">{constructor.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{constructor.country}</td>
                  <td className="px-6 py-4 text-center font-bold text-f1red">
                    <span ref={(el) => (pointsRef.current[index] = el)}>
                      {constructor.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ConstructorStandings;
