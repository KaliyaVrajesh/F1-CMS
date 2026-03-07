import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/">
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-2xl font-bold">
                <span className="text-f1red">F1</span>
                <span className="text-white">-CMS</span>
              </div>
            </motion.div>
          </Link>

          <div className="flex items-center space-x-4">
            <Link to="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-gray-300 hover:text-white transition"
              >
                Home
              </motion.button>
            </Link>

            <Link to="/championship">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-gray-300 hover:text-white transition"
              >
                Championship
              </motion.button>
            </Link>

            <Link to="/circuits">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-gray-300 hover:text-white transition"
              >
                Circuits
              </motion.button>
            </Link>

            {user ? (
              <>
                {isAdmin() && (
                  <Link to="/dashboard">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-gray-300 hover:text-white transition"
                    >
                      Dashboard
                    </motion.button>
                  </Link>
                )}
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400">
                    {user.name}
                    {isAdmin() && (
                      <span className="ml-2 px-2 py-1 bg-f1red text-xs rounded">
                        ADMIN
                      </span>
                    )}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                  >
                    Logout
                  </motion.button>
                </div>
              </>
            ) : (
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-f1red hover:bg-red-700 rounded-lg transition"
                >
                  Login
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
