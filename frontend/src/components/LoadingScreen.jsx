import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const LoadingScreen = ({ isLoading }) => {
  const screenRef = useRef(null);
  const trackRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    if (!trackRef.current || !lineRef.current) return;

    // Rotate track continuously
    gsap.to(trackRef.current, {
      rotation: 360,
      duration: 3,
      repeat: -1,
      ease: 'linear',
    });

    // Animate racing line
    const line = lineRef.current;
    const length = line.getTotalLength();
    
    gsap.set(line, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });

    gsap.to(line, {
      strokeDashoffset: 0,
      duration: 1.5,
      repeat: -1,
      ease: 'linear',
    });
  }, []);

  useEffect(() => {
    if (!screenRef.current) return;

    if (isLoading) {
      // Fade in
      gsap.to(screenRef.current, {
        opacity: 1,
        duration: 0.2,
        display: 'flex',
      });
    } else {
      // Fade out
      gsap.to(screenRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          if (screenRef.current) {
            screenRef.current.style.display = 'none';
          }
        },
      });
    }
  }, [isLoading]);

  return (
    <div
      ref={screenRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900"
      style={{ opacity: 0, display: 'none' }}
    >
      <div className="text-center">
        {/* Animated Track */}
        <div className="mb-6 flex justify-center">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className="drop-shadow-[0_0_20px_rgba(225,6,0,0.6)]"
          >
            <g ref={trackRef} style={{ transformOrigin: '60px 60px' }}>
              {/* Track outline */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="8"
              />
              
              {/* Racing line */}
              <circle
                ref={lineRef}
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#E10600"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* Loading text */}
        <div className="text-2xl font-bold mb-2">
          <span className="text-f1red">F1</span>
          <span className="text-white">-CMS</span>
        </div>
        
        <div className="text-gray-400 text-sm animate-pulse">
          Loading...
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
