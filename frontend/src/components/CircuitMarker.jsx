import { useRef, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import gsap from 'gsap';
import L from 'leaflet';

// Custom F1 marker icon with pulse animation
const createF1Icon = () => {
  return L.divIcon({
    className: 'custom-f1-marker',
    html: `
      <div class="relative">
        <div class="absolute inset-0 bg-f1red rounded-full animate-ping opacity-75"></div>
        <div class="relative w-8 h-8 bg-f1red rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <span class="text-white text-xs font-bold">F1</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const CircuitMarker = ({ race, onMarkerClick, isActive }) => {
  const trackWrapperRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (!isActive || !trackWrapperRef.current || !race.trackSvg) return;

    // Wait for SVG to be rendered in DOM
    const timer = setTimeout(() => {
      const wrapper = trackWrapperRef.current;
      if (!wrapper) return;

      const svg = wrapper.querySelector('svg');
      if (!svg) return;

      // Ensure SVG has proper transform origin
      svg.style.transformBox = 'fill-box';
      svg.style.transformOrigin = 'center';

      // Find the first path element
      const path = svg.querySelector('path');
      if (!path) return;

      // Apply glow effect to the path
      path.style.filter = 'drop-shadow(0 0 6px #E10600)';

      // Kill any existing timeline
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      try {
        const length = path.getTotalLength();

        // Set up the stroke dash for animation
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        // Create animation timeline
        const tl = gsap.timeline();
        timelineRef.current = tl;

        // Animate stroke dash offset with yoyo for smooth forward/reverse
        tl.to(path, {
          strokeDashoffset: 0,
          duration: 3,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        });

        // Add rotation to the entire SVG
        tl.to(svg, {
          rotation: 360,
          duration: 30,
          ease: 'linear',
          repeat: -1,
          transformOrigin: '50% 50%',
        }, 0); // Start rotation from the beginning

        // Add subtle floating animation to the wrapper
        gsap.to(wrapper, {
          y: -6,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

      } catch (e) {
        console.warn('Could not animate track:', e);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [isActive, race.trackSvg]);

  const position = [race.latitude || 0, race.longitude || 0];
  
  // Skip if no valid coordinates
  if (!race.latitude || !race.longitude) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={createF1Icon()}
      eventHandlers={{
        click: () => onMarkerClick?.(race),
      }}
    >
      <Popup className="custom-popup" maxWidth={360} minWidth={320}>
        <div className="bg-dark-900 text-white p-4 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg mb-1">{race.name}</h3>
              <p className="text-sm text-gray-400">{race.circuit}</p>
            </div>
            {race.circuitCountry && (
              <span className="text-2xl ml-2">{getCountryFlag(race.circuitCountry)}</span>
            )}
          </div>

          {/* Track Layout SVG */}
          <div 
            className="mb-3 bg-dark-800 rounded-lg p-4 flex items-center justify-center" 
            style={{ height: '140px', width: '100%', overflow: 'visible' }}
          >
            {race.trackSvg ? (
              <div
                ref={trackWrapperRef}
                className="track-wrapper"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  width: '100%',
                  overflow: 'visible',
                }}
              >
                <div
                  className="track-svg"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  dangerouslySetInnerHTML={{ __html: race.trackSvg }}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm">
                <div className="mb-2">🏁</div>
                <div>Track layout not available</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{new Date(race.date).toLocaleDateString()}</span>
            <span className="text-f1red font-semibold">Season {race.season?.year}</span>
          </div>

          {race.circuitCity && race.circuitCountry && (
            <div className="text-xs text-gray-500 mb-2">
              {race.circuitCity}, {race.circuitCountry}
            </div>
          )}

          {race.results && race.results.length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <span className="text-xs text-green-400">✓ Results Available</span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

// Helper function to get country flag emoji
const getCountryFlag = (country) => {
  const flags = {
    monaco: '🇲🇨',
    uk: '🇬🇧',
    'united kingdom': '🇬🇧',
    italy: '🇮🇹',
    belgium: '🇧🇪',
    japan: '🇯🇵',
    brazil: '🇧🇷',
    spain: '🇪🇸',
    austria: '🇦🇹',
    bahrain: '🇧🇭',
    uae: '🇦🇪',
    'united arab emirates': '🇦🇪',
    usa: '🇺🇸',
    'united states': '🇺🇸',
    singapore: '🇸🇬',
    australia: '🇦🇺',
    canada: '🇨🇦',
    france: '🇫🇷',
    germany: '🇩🇪',
    hungary: '🇭🇺',
    netherlands: '🇳🇱',
    mexico: '🇲🇽',
    azerbaijan: '🇦🇿',
    'saudi arabia': '🇸🇦',
    qatar: '🇶🇦',
  };
  
  return flags[country.toLowerCase()] || '🏁';
};

export default CircuitMarker;
