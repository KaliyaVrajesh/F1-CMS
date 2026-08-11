import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getF1NextRace } from '../services/api';
import { Link } from 'react-router-dom';

const FLAG = {
  monaco: '🇲🇨', 'united kingdom': '🇬🇧', uk: '🇬🇧', britain: '🇬🇧',
  italy: '🇮🇹', belgium: '🇧🇪', japan: '🇯🇵', brazil: '🇧🇷',
  spain: '🇪🇸', austria: '🇦🇹', bahrain: '🇧🇭',
  'united arab emirates': '🇦🇪', uae: '🇦🇪',
  'united states': '🇺🇸', usa: '🇺🇸',
  singapore: '🇸🇬', australia: '🇦🇺', canada: '🇨🇦',
  france: '🇫🇷', germany: '🇩🇪', hungary: '🇭🇺',
  netherlands: '🇳🇱', mexico: '🇲🇽', azerbaijan: '🇦🇿',
  'saudi arabia': '🇸🇦', qatar: '🇶🇦', china: '🇨🇳',
  'las vegas': '🇺🇸',
};

const getFlag = (c) => FLAG[(c || '').toLowerCase()] || '🏁';

export default function RaceCountdownWidget() {
  const [race, setRace] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    getF1NextRace()
      .then(({ data }) => setRace(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!race?.date) return;

    const targetDate = new Date(`${race.date}T${race.time || '14:00:00Z'}`).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [race]);

  if (!race) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-12"
    >
      <div className="relative overflow-hidden rounded-2xl glass border border-f1red/30 p-6 md:p-8">
        {/* Ambient background glow */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: '#E10600' }}
        />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Race Header Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getFlag(race.country)}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest uppercase bg-f1red/20 text-f1red border border-f1red/40">
                NEXT GRAND PRIX · ROUND {race.round || '1'}
              </span>
            </div>

            <h2 className="font-f1heading font-black text-3xl md:text-5xl uppercase text-white tracking-wide leading-tight">
              {race.name}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {race.circuitName} · {race.locality}, {race.country}
            </p>
          </div>

          {/* Real-time Countdown Timer */}
          <div className="flex items-center gap-3 md:gap-4 bg-dark-900/80 px-5 py-4 rounded-xl border border-white/10">
            {[
              { label: 'DAYS', value: timeLeft.days },
              { label: 'HOURS', value: timeLeft.hours },
              { label: 'MINS', value: timeLeft.minutes },
              { label: 'SECS', value: timeLeft.seconds },
            ].map((unit, idx) => (
              <div key={unit.label} className="flex items-center">
                <div className="text-center min-w-[52px]">
                  <div className="font-f1heading font-black text-3xl md:text-4xl text-white tabular-nums leading-none">
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] font-mono font-bold tracking-widest text-gray-500 mt-1">
                    {unit.label}
                  </div>
                </div>
                {idx < 3 && <span className="text-f1red text-2xl font-bold ml-3 md:ml-4 -mt-2">:</span>}
              </div>
            ))}
          </div>

          {/* Live Track Telemetry Weather Pill & Link */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3 text-xs font-mono text-gray-400 bg-white/5 px-3 py-2 rounded-lg border border-white/5">
              <span className="flex items-center gap-1 text-yellow-400">
                ☀️ 28°C <span className="text-gray-500 text-[10px]">AIR</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-orange-400">
                🏎️ 39°C <span className="text-gray-500 text-[10px]">TRACK</span>
              </span>
              <span>•</span>
              <span className="text-blue-400">0% RAIN</span>
            </div>

            <Link
              to="/circuits-map"
              className="px-4 py-2 bg-f1red/15 hover:bg-f1red text-f1red hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider border border-f1red/30 transition-all duration-300 flex items-center gap-1.5"
            >
              Explore Circuit Map →
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
