import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';

const ChampionshipDashboard = () => {
  const { isAdmin } = useAuth();

  const cards = [
    {
      title: 'Driver Standings',
      description: 'View current driver championship standings',
      link: '/standings/drivers',
      icon: '🏎️',
      public: true,
    },
    {
      title: 'Constructor Standings',
      description: 'View current constructor championship standings',
      link: '/standings/constructors',
      icon: '🏆',
      public: true,
    },
    {
      title: 'Circuits Map',
      description: 'Explore F1 circuits around the world',
      link: '/circuits-map',
      icon: '🗺️',
      public: true,
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
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-f1red">Championship</span> Management
        </h1>
        <p className="text-gray-400 text-lg">
          Manage F1 drivers, teams, and track championship standings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          if (card.admin && !isAdmin()) return null;

          return (
            <div key={card.title}>
              <Link to={card.link}>
                <div className="glass rounded-xl p-6 hover:border-f1red transition-all duration-300 h-full cursor-pointer group">
                  <div className="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110">
                    {card.icon}
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-f1red transition">
                    {card.title}
                  </h2>
                  <p className="text-gray-400">{card.description}</p>
                  {card.admin && (
                    <span className="inline-block mt-3 px-3 py-1 bg-f1red text-xs rounded">
                      ADMIN ONLY
                    </span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChampionshipDashboard;
