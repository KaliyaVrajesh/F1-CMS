import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRaces, getDrivers, createRace, submitRaceResults } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ManageRaces = () => {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceFormData, setRaceFormData] = useState({
    name: '',
    circuit: '',
    date: '',
    seasonYear: new Date().getFullYear(),
    latitude: '',
    longitude: '',
    circuitCountry: '',
    circuitCity: '',
    trackSvg: '',
  });
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [racesRes, driversRes] = await Promise.all([getRaces(), getDrivers()]);
      setRaces(racesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRaceChange = (e) => {
    setRaceFormData({ ...raceFormData, [e.target.name]: e.target.value });
  };

  const handleRaceSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...raceFormData,
        latitude: raceFormData.latitude ? parseFloat(raceFormData.latitude) : null,
        longitude: raceFormData.longitude ? parseFloat(raceFormData.longitude) : null,
      };
      await createRace(dataToSubmit);
      toast.success('Race created successfully');
      setRaceFormData({
        name: '',
        circuit: '',
        date: '',
        seasonYear: new Date().getFullYear(),
        latitude: '',
        longitude: '',
        circuitCountry: '',
        circuitCity: '',
        trackSvg: '',
      });
      setShowRaceForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create race');
    }
  };

  const handleSubmitResults = (race) => {
    // Navigate to edit page if results exist, otherwise show form
    if (race.results && race.results.length > 0) {
      navigate(`/edit-race-results/${race._id}`);
    } else {
      setSelectedRace(race);
      setResults(
        drivers.map((driver, index) => ({
          driverId: driver._id,
          driverName: driver.name,
          position: index + 1,
        }))
      );
      setShowResultsForm(true);
    }
  };

  const handlePositionChange = (driverId, position) => {
    setResults(
      results.map((r) =>
        r.driverId === driverId ? { ...r, position: parseInt(position) } : r
      )
    );
  };

  const handleResultsSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitRaceResults(selectedRace._id, {
        results: results.map((r) => ({ driverId: r.driverId, position: r.position })),
      });
      toast.success('Race results submitted successfully');
      setShowResultsForm(false);
      setSelectedRace(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit results');
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
        className="flex items-center justify-between mb-8"
      >
        <h1 className="text-4xl font-bold">
          <span className="text-f1red">Manage</span> Races
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRaceForm(!showRaceForm)}
          className="px-6 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
        >
          {showRaceForm ? 'Cancel' : '+ Add Race'}
        </motion.button>
      </motion.div>

      {showRaceForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">Add New Race</h2>
          <form onSubmit={handleRaceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                value={raceFormData.name}
                onChange={handleRaceChange}
                placeholder="Race Name (e.g., Monaco Grand Prix)"
                required
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
              <input
                type="text"
                name="circuit"
                value={raceFormData.circuit}
                onChange={handleRaceChange}
                placeholder="Circuit Name (e.g., Circuit de Monaco)"
                required
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="circuitCity"
                value={raceFormData.circuitCity}
                onChange={handleRaceChange}
                placeholder="City (e.g., Monte Carlo)"
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
              <input
                type="text"
                name="circuitCountry"
                value={raceFormData.circuitCountry}
                onChange={handleRaceChange}
                placeholder="Country (e.g., Monaco)"
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                name="date"
                value={raceFormData.date}
                onChange={handleRaceChange}
                required
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
              <input
                type="number"
                name="seasonYear"
                value={raceFormData.seasonYear}
                onChange={handleRaceChange}
                placeholder="Season Year"
                required
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
            </div>

            <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                GPS Coordinates (Required for map display)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  name="latitude"
                  value={raceFormData.latitude}
                  onChange={handleRaceChange}
                  placeholder="Latitude (e.g., 43.7347)"
                  step="any"
                  min="-90"
                  max="90"
                  className="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-lg focus:outline-none focus:border-f1red"
                />
                <input
                  type="number"
                  name="longitude"
                  value={raceFormData.longitude}
                  onChange={handleRaceChange}
                  placeholder="Longitude (e.g., 7.4206)"
                  step="any"
                  min="-180"
                  max="180"
                  className="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-lg focus:outline-none focus:border-f1red"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Use Google Maps to find exact circuit coordinates
              </p>
            </div>

            <div className="bg-dark-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Track SVG (Optional - for custom track shape on map)
              </h3>
              <textarea
                name="trackSvg"
                value={raceFormData.trackSvg}
                onChange={handleRaceChange}
                placeholder='Paste SVG path data here (e.g., <svg>...</svg> or just the path "d" attribute)'
                rows="3"
                className="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-lg focus:outline-none focus:border-f1red font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Optional: Paste custom SVG markup for accurate track shape (max 200kb)
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
            >
              Create Race
            </button>
          </form>
        </motion.div>
      )}

      {showResultsForm && selectedRace && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">
            Submit Results for {selectedRace.name}
          </h2>
          <form onSubmit={handleResultsSubmit}>
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {results
                .sort((a, b) => a.position - b.position)
                .map((result) => (
                  <div key={result.driverId} className="flex items-center space-x-4">
                    <input
                      type="number"
                      value={result.position}
                      onChange={(e) => handlePositionChange(result.driverId, e.target.value)}
                      min="1"
                      className="w-20 px-3 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
                    />
                    <span className="flex-1">{result.driverName}</span>
                  </div>
                ))}
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
              >
                Submit Results
              </button>
              <button
                type="button"
                onClick={() => setShowResultsForm(false)}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-800">
            <tr>
              <th className="px-6 py-4 text-left">Race</th>
              <th className="px-6 py-4 text-left">Circuit</th>
              <th className="px-6 py-4 text-left">Date</th>
              <th className="px-6 py-4 text-left">Season</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {races.map((race) => (
              <tr
                key={race._id}
                className="border-t border-gray-800 hover:bg-dark-800 transition"
              >
                <td className="px-6 py-4 font-semibold">{race.name}</td>
                <td className="px-6 py-4 text-gray-400">{race.circuit}</td>
                <td className="px-6 py-4 text-gray-400">
                  {new Date(race.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-gray-400">{race.season?.year}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => navigate(`/edit-race/${race._id}`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
                  >
                    Edit Race
                  </button>
                  <button
                    onClick={() => handleSubmitResults(race)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
                  >
                    {race.results && race.results.length > 0 ? 'Edit Results' : 'Submit Results'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageRaces;
