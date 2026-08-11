import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import AnimatedText from './AnimatedText';
import { isAudioMuted, toggleAudio, playPaddleShift, playStartingBeep } from '../utils/audio';

const NavLink = ({ to, label }) => (
  <Link
    to={to}
    className="relative"
    onClick={() => playPaddleShift(1.0)}
    onMouseEnter={() => playPaddleShift(1.2)}
  >
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
  const location = useLocation();
  const [muted, setMuted] = useState(isAudioMuted());
  const [lightsCount, setLightsCount] = useState(0);

  // Trigger 5-red-light sequence on route navigation
  useEffect(() => {
    setLightsCount(0);
    const timers = [];

    for (let i = 1; i <= 5; i++) {
      timers.push(
        setTimeout(() => {
          setLightsCount(i);
          playStartingBeep(false);
        }, i * 80)
      );
    }

    // Lights out!
    timers.push(
      setTimeout(() => {
        setLightsCount(6); // 6 = green / lights out
        playStartingBeep(true);
        setTimeout(() => setLightsCount(0), 400);
      }, 520)
    );

    return () => timers.forEach(t => clearTimeout(t));
  }, [location.pathname]);

  const handleToggleSound = () => {
    const isNowMuted = toggleAudio();
    setMuted(isNowMuted);
    toast.success(isNowMuted ? 'F1 Sound FX Muted' : 'F1 Sound FX Enabled');
  };

  const handleLogout = () => {
    playPaddleShift(0.9);
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50 font-f1 relative">
      {/* ── F1 5-Light Starting Sequence Strip ── */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-black/60 flex items-center justify-center gap-1.5 px-4 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => {
          const isLit = lightsCount > i && lightsCount <= 5;
          const isLightsOut = lightsCount === 6;

          return (
            <div
              key={i}
              className="flex-1 max-w-[48px] h-[3px] rounded-full transition-all duration-75"
              style={{
                backgroundColor: isLightsOut
                  ? '#00e676'
                  : isLit
                  ? '#E10600'
                  : 'rgba(255,255,255,0.06)',
                boxShadow: isLightsOut
                  ? '0 0 8px #00e676'
                  : isLit
                  ? '0 0 8px #E10600'
                  : 'none',
              }}
            />
          );
        })}
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            onClick={() => playPaddleShift(1.1)}
            onMouseEnter={() => playPaddleShift(1.2)}
          >
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

            {/* Audio Toggle Button with Equalizer bars */}
            <button
              onClick={handleToggleSound}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono transition-all"
              title={muted ? 'Enable F1 Sound FX' : 'Mute F1 Sound FX'}
            >
              <div className="flex items-end gap-[2px] h-3 w-3.5">
                {[4, 8, 12, 6].map((h, i) => (
                  <div
                    key={i}
                    className={`w-[2px] rounded-full transition-all duration-200 ${
                      muted ? 'bg-gray-600 h-[3px]' : 'bg-f1red animate-pulse'
                    }`}
                    style={{
                      height: muted ? '3px' : `${h}px`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] hidden sm:inline font-bold uppercase tracking-wider">
                {muted ? 'MUTED' : 'FX ON'}
              </span>
            </button>

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
                  onClick={() => playPaddleShift(1.0)}
                  className="px-4 py-2 bg-f1red hover:bg-red-700 rounded-lg transition text-sm font-semibold shadow-lg shadow-f1red/20"
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
