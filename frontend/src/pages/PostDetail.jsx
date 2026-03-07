import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPostById } from '../services/api';
import toast from 'react-hot-toast';

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const { data } = await getPostById(id);
      setPost(data);
    } catch (error) {
      toast.error('Failed to fetch post');
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

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-xl">Post not found</p>
        <Link to="/" className="text-f1red hover:underline mt-4 inline-block">
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <Link to="/" className="text-f1red hover:underline mb-6 inline-block">
        ← Back to posts
      </Link>

      {/* Featured Image */}
      {post.imageUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative w-full h-[400px] rounded-2xl overflow-hidden mb-8"
        >
          <img
            src={post.imageUrl}
            alt={post.imageAlt || post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent"></div>
        </motion.div>
      )}

      <div className="glass rounded-2xl p-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-700">
          <span>By {post.author?.name || 'Unknown'}</span>
          <span>•</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PostDetail;
