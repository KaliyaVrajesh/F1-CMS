import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPost } from '../services/api';
import toast from 'react-hot-toast';

const CreatePost = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    imageAlt: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createPost(formData);
      toast.success('Post created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-8">
          <span className="text-f1red">Create</span> New Post
        </h1>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
              placeholder="Enter post title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows="12"
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition resize-none"
              placeholder="Write your content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Featured Image URL (optional)</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a direct image URL for the featured image
            </p>
          </div>

          {formData.imageUrl && (
            <div>
              <label className="block text-sm font-medium mb-2">Image Preview</label>
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-dark-800">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x400/1a1a1a/E10600?text=Invalid+Image+URL';
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Image Alt Text (optional)</label>
            <input
              type="text"
              name="imageAlt"
              value={formData.imageAlt}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:outline-none focus:border-f1red transition"
              placeholder="Describe the image for accessibility"
            />
          </div>

          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate('/dashboard')}
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

export default CreatePost;
