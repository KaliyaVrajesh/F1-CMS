import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import gsap from 'gsap';

const ChampionshipDashboard = () => {
  const { isAdmin } = useAuth();
  const cardsRef = useRef([]);

  useEffect(() => {
    // Animate cards on mount
    gsap.from(cardsRef.current, {
      opacity: 0,
      y: 40,
      scale: 0.9,
      duration: 0.6,
      stagger: 0.12,
      ease: 'back.out(1.4)',
    });
  }, []);

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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-f1red">Championship</span> Management
        </h1>
        <p className="text-gray-400 text-lg">
          Manage F1 drivers, teams, and track championship standings
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          if (card.admin && !isAdmin()) return null;

          return (
            <div
              key={card.title}
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <Link to={card.link}>
                <div className="glass rounded-xl p-6 hover:border-f1red transition-all duration-300 h-full cursor-pointer">
                  <div className="text-5xl mb-4">{card.icon}</div>
                  <h2 className="text-2xl font-bold mb-3 text-white hover:text-f1red transition">
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
