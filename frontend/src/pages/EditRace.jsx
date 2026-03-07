import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRaceById, updateRace } from '../services/api';
import toast from 'react-hot-toast';
import gsap from 'gsap';

const EditRace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
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
  const [hasResults, setHasResults] = useState(false);

  useEffect(() => {
    fetchRace();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      // Animate form fields
      gsap.from('.form-field', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        stagger: 0.1,
        ease: 'power2.out',
      });
    }
  }, [loading]);

  const fetchRace = async () => {
    try {
      const { data } = await getRaceById(id);
      
      // Format date for input (YYYY-MM-DD)
      const dateObj = new Date(data.date);
      const formattedDate = dateObj.toISOString().split('T')[0];

      setFormData({
        name: data.name,
        circuit: data.circuit,
        date: formattedDate,
        seasonYear: data.season?.year || new Date().getFullYear(),
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        circuitCountry: data.circuitCountry || '',
        circuitCity: data.circuitCity || '',
        trackSvg: data.trackSvg || '',
      });

      setHasResults(data.results && data.results.length > 0);
    } catch (error) {
      toast.error('Failed to fetch race data');
      navigate('/manage/races');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      const dataToSubmit = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      await updateRace(id, dataToSubmit);
      
      // Success animation
      gsap.to('.success-icon', {
        scale: 1.2,
        duration: 0.3,
        ease: 'back.out',
      });

      toast.success('Race updated successfully!');
      setTimeout(() => navigate('/manage/races'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update race');
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
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-f1red">Edit</span> Race
        </h1>
        <p className="text-gray-400">Update race details</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8"
      >
        {hasResults && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
            <p className="text-blue-400 text-sm">
              ℹ️ This race has results. Editing race details will not affect existing results or points.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-field">
            <label className="block text-sm font-medium mb-2">Race Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
              placeholder="e.g., Monaco Grand Prix"
            />
          </div>

          <div className="form-field">
            <label className="block text-sm font-medium mb-2">Circuit</label>
            <input
              type="text"
              name="circuit"
              value={formData.circuit}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
              placeholder="e.g., Circuit de Monaco"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 form-field">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                name="circuitCity"
                value={formData.circuitCity}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
                placeholder="e.g., Monte Carlo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <input
                type="text"
                name="circuitCountry"
                value={formData.circuitCountry}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
                placeholder="e.g., Monaco"
              />
            </div>
          </div>

          <div className="form-field bg-dark-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              GPS Coordinates (Required for map display)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g., 43.7347"
                  step="any"
                  min="-90"
                  max="90"
                  className="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-lg focus:outline-none focus:border-f1red transition"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g., 7.4206"
                  step="any"
                  min="-180"
                  max="180"
                  className="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-lg focus:outline-none focus:border-f1red transition"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Use Google Maps to find exact circuit coordinates
            </p>
          </div>

          <div className="form-field bg-dark-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              Track SVG (Optional - for custom track shape on map)
            </h3>
            <textarea
              name="trackSvg"
              value={formData.trackSvg}
              onChange={handleChange}
              placeholder='Paste SVG path data here (e.g., <svg>...</svg> or just the path "d" attribute)'
              rows="4"
              className="w-full px-4 py-3 bg-dark-900 border border-gray-600 rounded-lg focus:outline-none focus:border-f1red font-mono text-xs transition"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Optional: Paste custom SVG markup for accurate track shape (max 200kb)
            </p>
          </div>

          <div className="form-field">
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
            />
          </div>

          <div className="form-field">
            <label className="block text-sm font-medium mb-2">Season Year</label>
            <input
              type="number"
              name="seasonYear"
              value={formData.seasonYear}
              onChange={handleChange}
              required
              min="2000"
              max="2100"
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
            />
            {formData.seasonYear !== new Date().getFullYear() && (
              <p className="text-xs text-yellow-500 mt-1">
                ⚠️ Changing the season will move this race to a different season
              </p>
            )}
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
                'Update Race'
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

export default EditRace;
