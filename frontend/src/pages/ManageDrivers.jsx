import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getDrivers, getConstructors, createDriver, updateDriver, deleteDriver } from '../services/api';
import toast from 'react-hot-toast';

const ManageDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nationality: '',
    team: '',
    number: '',
    imageUrl: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [driversRes, constructorsRes] = await Promise.all([
        getDrivers(),
        getConstructors(),
      ]);
      setDrivers(driversRes.data);
      setConstructors(constructorsRes.data);
      
      // Show message if no constructors exist
      if (constructorsRes.data.length === 0) {
        toast.error('Please create constructors first before adding drivers!');
      }
    } catch (error) {
      toast.error('Failed to fetch data: ' + (error.response?.data?.message || error.message));
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await updateDriver(editingDriver._id, formData);
        toast.success('Driver updated successfully');
      } else {
        await createDriver(formData);
        toast.success('Driver created successfully');
      }
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      nationality: driver.nationality,
      team: driver.team._id,
      number: driver.number,
      imageUrl: driver.imageUrl || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await deleteDriver(id);
        toast.success('Driver deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete driver');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', nationality: '', team: '', number: '', imageUrl: '' });
    setEditingDriver(null);
    setShowForm(false);
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
          <span className="text-f1red">Manage</span> Drivers
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
        >
          {showForm ? 'Cancel' : '+ Add Driver'}
        </motion.button>
      </motion.div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">
            {editingDriver ? 'Edit Driver' : 'Add New Driver'}
          </h2>
          
          {constructors.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-yellow-400">
                ⚠️ No teams available! Please create constructors first in the{' '}
                <a href="/manage/constructors" className="text-f1red underline">
                  Manage Constructors
                </a>{' '}
                page.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Driver Name"
              required
              className="px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
            />
            <input
              type="text"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
              placeholder="Nationality"
              required
              className="px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
            />
            <select
              name="team"
              value={formData.team}
              onChange={handleChange}
              required
              className="px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
            >
              <option value="">Select Team</option>
              {constructors.map((constructor) => (
                <option key={constructor._id} value={constructor._id}>
                  {constructor.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="number"
              value={formData.number}
              onChange={handleChange}
              placeholder="Driver Number"
              required
              min="1"
              max="99"
              className="px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
            />
            <div className="md:col-span-2">
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="Driver Image URL (optional)"
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a direct image URL (e.g., https://example.com/driver.jpg)
              </p>
            </div>
            <div className="md:col-span-2 flex space-x-4">
              <button
                type="submit"
                disabled={constructors.length === 0}
                className="flex-1 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingDriver ? 'Update Driver' : 'Create Driver'}
              </button>
              <button
                type="button"
                onClick={resetForm}
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
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-left">Number</th>
              <th className="px-6 py-4 text-left">Nationality</th>
              <th className="px-6 py-4 text-left">Team</th>
              <th className="px-6 py-4 text-center">Points</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr
                key={driver._id}
                className="border-t border-gray-800 hover:bg-dark-800 transition"
              >
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
                <td className="px-6 py-4">#{driver.number}</td>
                <td className="px-6 py-4 text-gray-400">{driver.nationality}</td>
                <td className="px-6 py-4 text-gray-400">{driver.team?.name}</td>
                <td className="px-6 py-4 text-center text-f1red font-bold">
                  {driver.points}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(driver)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(driver._id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
                  >
                    Delete
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

export default ManageDrivers;
