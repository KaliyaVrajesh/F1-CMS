import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import AnimatedText from './AnimatedText';

const NavLink = ({ to, label }) => (
  <Link to={to} className="relative">
    <AnimatedText
      text={label}
      letterClass="text-gray-300"
      hoverClass="text-white"
      totalMs={0.35}
    />
  </Link>
);

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50 font-f1">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/">
            <motion.div
              className="flex items-center space-x-1"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-2xl font-f1heading font-black tracking-widest text-f1red">F1</span>
              <span className="text-2xl font-f1heading font-black tracking-widest text-white">-CMS</span>
            </motion.div>
          </Link>

          {/* Nav items */}
          <div className="flex items-center space-x-6">
            <NavLink to="/" label="Home" />
            <NavLink to="/championship" label="Championship" />
            <NavLink to="/circuits-map" label="Circuits" />
            <NavLink to="/legends" label="Legends" />

            {user ? (
              <>
                {isAdmin() && <NavLink to="/dashboard" label="Dashboard" />}
                <div className="flex items-center space-x-3 ml-2">
                  <span className="text-sm text-gray-400 font-f1">
                    {user.name}
                    {isAdmin() && (
                      <span className="ml-2 px-2 py-0.5 bg-f1red text-xs rounded font-bold tracking-wider">
                        ADMIN
                      </span>
                    )}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
                  >
                    Logout
                  </motion.button>
                </div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-f1red hover:bg-red-700 rounded-lg transition text-sm font-semibold"
                >
                  Login
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
