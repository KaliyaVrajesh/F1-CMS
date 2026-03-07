import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPosts, deletePost } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await getPosts();
      setPosts(data);
    } catch (error) {
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(id);
        toast.success('Post deleted successfully');
        setPosts(posts.filter((post) => post._id !== id));
      } catch (error) {
        toast.error('Failed to delete post');
      }
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
          <span className="text-f1red">Admin</span> Dashboard
        </h1>
        <Link to="/create-post">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-f1red hover:bg-red-700 rounded-lg font-semibold transition"
          >
            + Create Post
          </motion.button>
        </Link>
      </motion.div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-xl mb-4">No posts yet</p>
          <Link to="/create-post">
            <button className="px-6 py-3 bg-f1red hover:bg-red-700 rounded-lg transition">
              Create your first post
            </button>
          </Link>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-6 py-4 text-left">Title</th>
                <th className="px-6 py-4 text-left">Author</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <motion.tr
                  key={post._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t border-gray-800 hover:bg-dark-800 transition"
                >
                  <td className="px-6 py-4">{post.title}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {post.author?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => navigate(`/posts/${post._id}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/edit-post/${post._id}`)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
                    >
                      Delete
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
