import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const CircuitSVG = ({ circuitName, isActive = false }) => {
  const trackGroupRef = useRef(null);
  const racingLineRef = useRef(null);
  const rotationTweenRef = useRef(null);
  const racingLineTweenRef = useRef(null);

  useEffect(() => {
    if (!racingLineRef.current || !trackGroupRef.current) return;

    const path = racingLineRef.current;
    const trackGroup = trackGroupRef.current;
    
    // Wait for SVG to be fully rendered
    setTimeout(() => {
      const length = path.getTotalLength();

      // Set up the racing line dash animation
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });

      // Racing line animation - draws the line continuously
      racingLineTweenRef.current = gsap.to(path, {
        strokeDashoffset: 0,
        duration: 4,
        ease: 'none',
        repeat: -1,
        paused: !isActive,
      });

      // Rotation animation for the entire track group
      rotationTweenRef.current = gsap.to(trackGroup, {
        rotation: 360,
        duration: 25,
        ease: 'linear',
        repeat: -1,
        transformOrigin: '50% 50%',
        paused: !isActive,
      });
    }, 100);

    return () => {
      if (racingLineTweenRef.current) {
        racingLineTweenRef.current.kill();
      }
      if (rotationTweenRef.current) {
        rotationTweenRef.current.kill();
      }
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      racingLineTweenRef.current?.play();
      rotationTweenRef.current?.play();
    } else {
      racingLineTweenRef.current?.pause();
      rotationTweenRef.current?.pause();
    }
  }, [isActive]);

  // Circuit path data for different famous tracks
  const getCircuitPath = (name) => {
    const circuits = {
      'Monaco': 'M 50 150 Q 80 100, 150 80 T 300 100 Q 350 120, 380 160 T 400 220 Q 380 260, 320 280 T 180 270 Q 120 250, 80 200 T 50 150',
      'Silverstone': 'M 100 150 Q 120 100, 200 90 T 350 120 Q 400 150, 420 200 T 380 260 Q 340 290, 250 280 T 120 240 Q 80 200, 100 150',
      'Monza': 'M 80 120 L 200 100 Q 280 95, 350 110 L 420 130 Q 450 160, 440 200 L 400 250 Q 360 280, 280 270 L 150 250 Q 90 230, 70 180 L 80 120',
      'Spa': 'M 60 180 Q 90 120, 160 100 T 280 110 Q 360 130, 400 180 T 420 250 Q 390 290, 310 280 T 150 250 Q 80 230, 60 180',
      'Suzuka': 'M 100 200 Q 150 150, 220 140 T 340 160 Q 400 190, 410 240 T 360 280 Q 300 290, 230 270 T 120 240 Q 80 220, 100 200',
      'default': 'M 100 150 Q 150 100, 250 100 T 400 150 Q 450 200, 400 250 T 250 250 Q 150 250, 100 200 T 100 150',
    };

    // Try to find matching circuit
    for (const [key, path] of Object.entries(circuits)) {
      if (name.toLowerCase().includes(key.toLowerCase())) {
        return path;
      }
    }

    return circuits.default;
  };

  const pathData = getCircuitPath(circuitName);

  return (
    <svg
      viewBox="0 0 500 300"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ filter: 'drop-shadow(0 0 10px rgba(225, 6, 0, 0.3))' }}
    >
      <defs>
        {/* Glow filter for racing line */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient for track */}
        <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
      </defs>

      <g ref={trackGroupRef} id="track-group">
        {/* Track outline (background) */}
        <path
          id="track-outline"
          d={pathData}
          fill="none"
          stroke="url(#trackGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Track surface */}
        <path
          d={pathData}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Racing line (animated) */}
        <path
          ref={racingLineRef}
          id="racing-line"
          d={pathData}
          fill="none"
          stroke="#E10600"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          style={{
            mixBlendMode: 'screen',
          }}
        />

        {/* Start/Finish line indicator */}
        <g transform="translate(100, 150)">
          <rect
            x="-3"
            y="-15"
            width="6"
            height="30"
            fill="white"
            opacity="0.8"
          />
          <rect
            x="-3"
            y="-15"
            width="6"
            height="10"
            fill="#E10600"
          />
          <rect
            x="-3"
            y="5"
            width="6"
            height="10"
            fill="#E10600"
          />
        </g>
      </g>

      {/* Circuit name label */}
      <text
        x="250"
        y="290"
        textAnchor="middle"
        fill="#666"
        fontSize="12"
        fontWeight="bold"
        letterSpacing="2"
      >
        {circuitName.toUpperCase()}
      </text>
    </svg>
  );
};

export default CircuitSVG;
