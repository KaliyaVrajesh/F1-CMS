import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getConstructors, createConstructor, updateConstructor, deleteConstructor } from '../services/api';
import toast from 'react-hot-toast';

const ManageConstructors = () => {
  const [constructors, setConstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConstructor, setEditingConstructor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    logoUrl: '',
  });

  useEffect(() => {
    fetchConstructors();
  }, []);

  const fetchConstructors = async () => {
    try {
      const { data } = await getConstructors();
      setConstructors(data);
    } catch (error) {
      toast.error('Failed to fetch constructors');
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
      if (editingConstructor) {
        await updateConstructor(editingConstructor._id, formData);
        toast.success('Constructor updated successfully');
      } else {
        await createConstructor(formData);
        toast.success('Constructor created successfully');
      }
      resetForm();
      fetchConstructors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (constructor) => {
    setEditingConstructor(constructor);
    setFormData({
      name: constructor.name,
      country: constructor.country,
      logoUrl: constructor.logoUrl || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this constructor?')) {
      try {
        await deleteConstructor(id);
        toast.success('Constructor deleted successfully');
        fetchConstructors();
      } catch (error) {
        toast.error('Failed to delete constructor');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', country: '', logoUrl: '' });
    setEditingConstructor(null);
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
          <span className="text-f1red">Manage</span> Constructors
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
        >
          {showForm ? 'Cancel' : '+ Add Constructor'}
        </motion.button>
      </motion.div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">
            {editingConstructor ? 'Edit Constructor' : 'Add New Constructor'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Constructor Name"
              required
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
            />
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Country"
              required
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
            />
            <div>
              <input
                type="url"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="Team Logo URL (optional)"
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a direct image URL (e.g., https://example.com/logo.png)
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
              >
                {editingConstructor ? 'Update Constructor' : 'Create Constructor'}
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
              <th className="px-6 py-4 text-left">Country</th>
              <th className="px-6 py-4 text-center">Points</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {constructors.map((constructor) => (
              <tr
                key={constructor._id}
                className="border-t border-gray-800 hover:bg-dark-800 transition"
              >
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
                <td className="px-6 py-4 text-center text-f1red font-bold">
                  {constructor.points}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(constructor)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(constructor._id)}
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

export default ManageConstructors;
