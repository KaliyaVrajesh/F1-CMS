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

// Fallback minimal track placeholder
const fallbackTrackPath = 'M25,50 Q35,25 55,30 T85,50 Q80,75 50,80 T25,50';

const CircuitMarker = ({ race, onMarkerClick, isActive }) => {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const rotationRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    // Animate track when popup is open
    if (isActive && pathRef.current && svgRef.current) {
      const path = pathRef.current;
      const svg = svgRef.current;
      
      // Get the group element for rotation
      const rotationGroup = svg.querySelector('.rotation-group');
      
      if (!rotationGroup) return;

      const length = path.getTotalLength();
      
      // Create timeline
      const tl = gsap.timeline();
      
      // Initial setup
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      gsap.set(rotationGroup, {
        transformOrigin: '50% 50%',
      });

      // Fade in
      tl.from(svg, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.out',
      })
      // Draw animation
      .to(path, {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '-=0.1')
      // Subtle rotation
      .to(rotationGroup, {
        rotation: 360,
        duration: 20,
        ease: 'none',
        repeat: -1,
      }, '-=0.5');

      timelineRef.current = tl;

      return () => {
        if (timelineRef.current) {
          timelineRef.current.kill();
        }
      };
    }
  }, [isActive]);

  const position = [race.latitude || 0, race.longitude || 0];
  
  // Skip if no valid coordinates
  if (!race.latitude || !race.longitude) {
    return null;
  }

  // Determine which track path to use
  const hasCustomTrack = !!race.trackSvg;

  return (
    <Marker
      position={position}
      icon={createF1Icon()}
      eventHandlers={{
        click: () => onMarkerClick?.(race),
      }}
    >
      <Popup className="custom-popup" maxWidth={320}>
        <div className="bg-dark-900 text-white p-4 rounded-lg min-w-[280px]">
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
          <div className="mb-3 bg-dark-800 rounded-lg p-4 relative overflow-hidden flex items-center justify-center" style={{ minHeight: '120px' }}>
            {hasCustomTrack ? (
              <div
                className="w-full flex items-center justify-center"
                style={{ 
                  filter: 'drop-shadow(0 0 10px rgba(225, 6, 0, 0.6))',
                }}
              >
                <div 
                  ref={svgRef}
                  className="track-svg-container"
                  dangerouslySetInnerHTML={{ 
                    __html: wrapSvgWithRotationGroup(race.trackSvg) 
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100px',
                  }}
                />
              </div>
            ) : (
              <svg
                ref={svgRef}
                viewBox="0 0 100 100"
                width="100%"
                height="100"
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  filter: 'drop-shadow(0 0 10px rgba(225, 6, 0, 0.6))',
                  maxWidth: '200px',
                }}
              >
                <g className="rotation-group">
                  <path
                    ref={pathRef}
                    d={fallbackTrackPath}
                    fill="none"
                    stroke="#E10600"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            )}
            <div className="absolute top-2 right-2 text-xs text-gray-500 font-mono">
              {race.circuitCity || 'Circuit'}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{new Date(race.date).toLocaleDateString()}</span>
            <span className="text-f1red font-semibold">Season {race.season?.year}</span>
          </div>

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

// Helper function to wrap custom SVG with rotation group
const wrapSvgWithRotationGroup = (svgString) => {
  if (!svgString) return '';
  
  // If it's a full SVG element, extract and wrap the content
  if (svgString.trim().startsWith('<svg')) {
    // Parse the SVG to extract viewBox and paths
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) return svgString;
    
    const viewBox = svgElement.getAttribute('viewBox') || '0 0 100 100';
    const innerHTML = svgElement.innerHTML;
    
    return `
      <svg 
        viewBox="${viewBox}" 
        width="100%" 
        height="100" 
        preserveAspectRatio="xMidYMid meet"
        style="max-width: 200px;"
      >
        <g class="rotation-group">
          ${innerHTML}
        </g>
      </svg>
    `;
  }
  
  // If it's just a path or paths, wrap it
  return `
    <svg 
      viewBox="0 0 100 100" 
      width="100%" 
      height="100" 
      preserveAspectRatio="xMidYMid meet"
      style="max-width: 200px;"
    >
      <g class="rotation-group">
        ${svgString}
      </g>
    </svg>
  `;
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
