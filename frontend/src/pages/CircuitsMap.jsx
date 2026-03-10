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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-f1red"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-f1red">World</span> Circuits
        </h1>
        <p className="text-gray-400 text-lg">
          Explore Formula 1 race circuits around the globe
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden" style={{ height: '600px' }}>
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
      </div>
    </div>
  );
};

export default CircuitsMap;
