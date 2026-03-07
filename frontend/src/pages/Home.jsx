import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPosts } from '../services/api';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import VideoHero from '../components/VideoHero';

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const postsRef = useRef([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!loading && posts.length > 0) {
      // GSAP stagger animation for posts with scroll trigger
      postsRef.current.forEach((el, index) => {
        if (el) {
          gsap.from(el, {
            opacity: 0,
            y: 60,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom-=100',
              toggleActions: 'play none none none',
            },
          });
        }
      });
    }
  }, [loading, posts]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-f1red"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-f1red font-bold">F1</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Video Hero Section */}
      <VideoHero />

      {/* Content Section */}
      <div id="content" className="max-w-7xl mx-auto py-20">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏁</div>
            <p className="text-gray-400 text-2xl font-light">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {posts[0] && (
              <div
                ref={(el) => (postsRef.current[0] = el)}
                className="mb-16"
              >
                <Link to={`/posts/${posts[0]._id}`}>
                  <div className="relative group overflow-hidden rounded-2xl h-[500px]">
                    {posts[0].imageUrl ? (
                      <>
                        <img
                          src={posts[0].imageUrl}
                          alt={posts[0].imageAlt || posts[0].title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent"></div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-f1red/20 to-dark-800"></div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <span className="inline-block px-4 py-1 bg-f1red text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                        Featured
                      </span>
                      <h2 className="text-4xl md:text-5xl font-black mb-4 text-white group-hover:text-f1red transition-colors">
                        {posts[0].title}
                      </h2>
                      <p className="text-gray-300 text-lg mb-4 line-clamp-2">
                        {posts[0].content}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{posts[0].author?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(posts[0].createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.slice(1).map((post, index) => (
                <div
                  key={post._id}
                  ref={(el) => (postsRef.current[index + 1] = el)}
                >
                  <Link to={`/posts/${post._id}`}>
                    <div className="group h-full">
                      <div className="relative overflow-hidden rounded-xl mb-4 aspect-video">
                        {post.imageUrl ? (
                          <>
                            <img
                              src={post.imageUrl}
                              alt={post.imageAlt || post.title}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-dark-800 flex items-center justify-center">
                            <span className="text-6xl">🏎️</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="glass rounded-xl p-6 hover:border-f1red transition-all duration-300">
                        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-f1red transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 mb-4 line-clamp-3 text-sm">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{post.author?.name || 'Unknown'}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Home;
