import { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { motion } from 'framer-motion';
import { getRaces } from '../services/api';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import CircuitMarker from '../components/CircuitMarker';

// Fix for default marker icon
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CircuitsMap = () => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRaceId, setActiveRaceId] = useState(null);

  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      const { data } = await getRaces();
      // Filter races that have valid coordinates
      const racesWithCoords = data.filter(race => race.latitude && race.longitude);
      setRaces(racesWithCoords);
      
      if (racesWithCoords.length === 0) {
        toast.error('No races with GPS coordinates found. Please add coordinates to races.');
      }
    } catch (error) {
      toast.error('Failed to fetch races');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = (race) => {
    setActiveRaceId(race._id);
  };

  const selectedRace = races.find(race => race._id === activeRaceId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-f1red">World</span> Circuits
        </h1>
        <p className="text-gray-400 text-lg">
          Explore Formula 1 race circuits around the globe
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl overflow-hidden"
        style={{ height: '600px' }}
      >
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {races.map((race) => (
            <CircuitMarker
              key={race._id}
              race={race}
              onMarkerClick={handleMarkerClick}
              isActive={activeRaceId === race._id}
            />
          ))}
        </MapContainer>
      </motion.div>

      {/* Race Info Panel */}
      {selectedRace && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass rounded-xl p-6 border border-f1red/30"
          style={{
            boxShadow: '0 0 30px rgba(225, 6, 0, 0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{selectedRace.name}</h2>
              <p className="text-gray-400 text-lg mb-1">{selectedRace.circuit}</p>
              {selectedRace.circuitCity && selectedRace.circuitCountry && (
                <p className="text-gray-500 text-sm">
                  {selectedRace.circuitCity}, {selectedRace.circuitCountry}
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveRaceId(null)}
              className="text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-dark-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Date</p>
              <p className="text-white font-semibold">
                {new Date(selectedRace.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-dark-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Season</p>
              <p className="text-f1red font-bold text-xl">{selectedRace.season?.year}</p>
            </div>
          </div>

          {selectedRace.latitude && selectedRace.longitude && (
            <div className="bg-dark-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-1">Coordinates</p>
              <p className="text-white font-mono text-sm">
                {selectedRace.latitude.toFixed(4)}°, {selectedRace.longitude.toFixed(4)}°
              </p>
            </div>
          )}

          {selectedRace.results && selectedRace.results.length > 0 && (
            <div className="flex items-center justify-between bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <span className="text-green-400 font-semibold">✓ Race Results Available</span>
              <a
                href={`/edit-race-results/${selectedRace._id}`}
                className="px-4 py-2 bg-f1red hover:bg-red-700 rounded-lg text-sm font-semibold transition"
              >
                View Results →
              </a>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CircuitsMap;
