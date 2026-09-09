import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEOHead from '../components/SEOHead';

const NotFound = () => {
  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you are looking for could not be found. Navigate back to F1 CMS."
        noIndex={true}
      />
      <section className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* Yellow flag indicator */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ background: 'linear-gradient(135deg, #FFD600 0%, #FFA000 100%)' }}
          >
            <span className="text-5xl">⚠️</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl md:text-8xl font-f1heading font-black text-white mb-4"
          >
            404
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl font-f1heading font-bold text-f1red uppercase tracking-wider mb-3"
          >
            Yellow Flag — Off Track
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-gray-400 text-lg mb-8"
          >
            Looks like you&apos;ve gone off the racing line. The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/"
              className="px-8 py-3 bg-f1red hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm uppercase tracking-wider shadow-lg shadow-f1red/20"
            >
              Back to Home
            </Link>
            <Link
              to="/championship"
              className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold rounded-lg transition-colors text-sm uppercase tracking-wider"
            >
              Championship
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default NotFound;
