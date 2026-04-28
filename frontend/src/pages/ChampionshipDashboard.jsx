import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import F1ParticleCanvas from '../components/F1ParticleCanvas';
import AnimatedText from '../components/AnimatedText';

const ChampionshipDashboard = () => {
  const { isAdmin } = useAuth();

  const cards = [
    {
      title: 'Driver Standings',
      description: 'View current driver championship standings',
      link: '/standings/drivers',
      icon: '🏎️',
    },
    {
      title: 'Constructor Standings',
      description: 'View current constructor championship standings',
      link: '/standings/constructors',
      icon: '🏆',
    },
    {
      title: 'Circuits Map',
      description: 'Explore F1 circuits around the world',
      link: '/circuits-map',
      icon: '🗺️',
    },
    {
      title: 'Manage Drivers',
      description: 'Add, edit, or remove drivers',
      link: '/manage/drivers',
      icon: '👤',
      admin: true,
    },
    {
      title: 'Manage Constructors',
      description: 'Add, edit, or remove teams',
      link: '/manage/constructors',
      icon: '🏁',
      admin: true,
    },
    {
      title: 'Manage Races',
      description: 'Create races and submit results',
      link: '/manage/races',
      icon: '📅',
      admin: true,
    },
  ];

  return (
    <div className="relative">
      <F1ParticleCanvas />

      {/* Content sits above the fixed canvas */}
      <div className="relative z-10 max-w-7xl mx-auto py-16">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-f1red font-f1heading font-bold tracking-[0.3em] text-sm uppercase mb-3">
            Formula 1
          </p>
          <h1 className="font-f1heading font-black uppercase text-6xl md:text-8xl leading-none mb-4">
            <span className="text-f1red">Championship</span>
            <br />
            <span className="text-white">Hub</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Manage drivers, teams, and track every point of the season
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            if (card.admin && !isAdmin()) return null;

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
              >
                <Link to={card.link}>
                  <div className="glass rounded-xl p-6 hover:border-f1red transition-all duration-300 h-full cursor-pointer group relative overflow-hidden">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: 'radial-gradient(ellipse at top left, rgba(225,6,0,0.12), transparent 70%)' }}
                    />
                    <div className="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110">
                      {card.icon}
                    </div>
                    <h2 className="font-f1heading text-2xl font-bold mb-3">
                      <AnimatedText
                        text={card.title}
                        letterClass="text-gray-200 font-f1heading font-bold uppercase tracking-wide text-2xl"
                        hoverClass="text-f1red font-f1heading font-bold uppercase tracking-wide text-2xl"
                        totalMs={0.42}
                        ease={[0.16, 1, 0.3, 1]}
                      />
                    </h2>
                    <p className="text-gray-400 text-sm">{card.description}</p>
                    {card.admin && (
                      <span className="inline-block mt-3 px-3 py-1 bg-f1red text-xs rounded font-bold tracking-wider">
                        ADMIN ONLY
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChampionshipDashboard;
