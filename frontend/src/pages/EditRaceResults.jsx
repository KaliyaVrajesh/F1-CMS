import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRaceById, getDrivers, updateRaceResults } from '../services/api';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import RaceIntro from '../components/RaceIntro';

const EditRaceResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [race, setRace] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && results.length > 0) {
      // Animate results list on load
      gsap.from('.result-row', {
        opacity: 0,
        x: -30,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
      });
    }
  }, [loading, results]);

  const fetchData = async () => {
    try {
      const [raceRes, driversRes] = await Promise.all([
        getRaceById(id),
        getDrivers(),
      ]);

      setRace(raceRes.data);
      setDrivers(driversRes.data);

      // Map existing results to editable format
      if (raceRes.data.results && raceRes.data.results.length > 0) {
        const mappedResults = raceRes.data.results
          .sort((a, b) => a.position - b.position)
          .map((result) => ({
            driverId: result.driver._id,
            driverName: result.driver.name,
            teamName: result.driver.team?.name || 'N/A',
            position: result.position,
            pointsAwarded: result.pointsAwarded,
          }));
        setResults(mappedResults);
      } else {
        // No results yet, initialize with all drivers
        const initialResults = driversRes.data.map((driver, index) => ({
          driverId: driver._id,
          driverName: driver.name,
          teamName: driver.team?.name || 'N/A',
          position: index + 1,
          pointsAwarded: 0,
        }));
        setResults(initialResults);
      }
    } catch (error) {
      toast.error('Failed to fetch race data');
      navigate('/manage/races');
    } finally {
      setLoading(false);
    }
  };

  const handlePositionChange = (driverId, newPosition) => {
    const position = parseInt(newPosition);
    setResults(
      results.map((r) =>
        r.driverId === driverId ? { ...r, position } : r
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Animate save button
    gsap.to('.save-btn', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    });

    try {
      await updateRaceResults(id, {
        results: results.map((r) => ({
          driverId: r.driverId,
          position: r.position,
        })),
      });

      // Success animation
      gsap.to('.success-check', {
        scale: 1.2,
        duration: 0.3,
        ease: 'back.out',
      });

      toast.success('Race results updated successfully!');
      setTimeout(() => navigate('/manage/races'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update results');
      setSaving(false);
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
      {showIntro && race && (
        <RaceIntro
          raceName={race.name}
          circuit={race.circuit}
          onComplete={() => setShowIntro(false)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-f1red">Edit</span> Race Results
        </h1>
        <p className="text-gray-400 text-lg">
          {race?.name} - {race?.circuit}
        </p>
        <p className="text-gray-500 text-sm">
          {new Date(race?.date).toLocaleDateString()}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ Editing race results will recalculate all points, wins, and podiums for drivers and constructors.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
            {results
              .sort((a, b) => a.position - b.position)
              .map((result, index) => (
                <div
                  key={result.driverId}
                  className="result-row flex items-center space-x-4 p-4 bg-dark-800 rounded-lg hover:bg-dark-700 transition"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="number"
                      value={result.position}
                      onChange={(e) =>
                        handlePositionChange(result.driverId, e.target.value)
                      }
                      min="1"
                      className="w-20 px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red text-center font-bold"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{result.driverName}</div>
                      <div className="text-sm text-gray-400">{result.teamName}</div>
                    </div>
                    <div className="text-f1red font-bold">
                      {result.pointsAwarded} pts
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="save-btn flex-1 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Results'
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate('/manage/races')}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditRaceResults;
