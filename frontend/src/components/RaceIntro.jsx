import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const RaceIntro = ({ raceName, circuit, onComplete }) => {
  const containerRef = useRef(null);
  const raceNameRef = useRef(null);
  const circuitRef = useRef(null);
  const lineRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          onComplete?.();
        }, 500);
      },
    });

    // Race intro sequence
    tl.to(containerRef.current, {
      opacity: 1,
      duration: 0.3,
    })
    .from(raceNameRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.8,
      ease: 'power4.out',
    })
    .from(lineRef.current, {
      scaleX: 0,
      duration: 0.6,
      ease: 'power2.inOut',
    }, '-=0.3')
    .from(circuitRef.current, {
      opacity: 0,
      x: -50,
      duration: 0.6,
      ease: 'power3.out',
    }, '-=0.3')
    .to(countdownRef.current?.children || [], {
      opacity: 1,
      scale: 1.5,
      duration: 0.4,
      stagger: 0.4,
      ease: 'power2.out',
      onComplete: function() {
        gsap.to(this.targets(), {
          opacity: 0,
          duration: 0.2,
        });
      },
    }, '+=0.5')
    .to(containerRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.inOut',
    }, '+=0.3');

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-dark-900 flex items-center justify-center opacity-0"
    >
      <div className="text-center">
        <h1
          ref={raceNameRef}
          className="text-6xl md:text-8xl font-black text-white mb-8"
        >
          {raceName}
        </h1>
        
        <div
          ref={lineRef}
          className="h-1 bg-f1red mx-auto mb-8"
          style={{ width: '300px', transformOrigin: 'center' }}
        ></div>
        
        <p
          ref={circuitRef}
          className="text-2xl md:text-4xl text-gray-400 font-light"
        >
          {circuit}
        </p>

        <div
          ref={countdownRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-9xl font-black text-f1red opacity-0">3</span>
          <span className="text-9xl font-black text-f1red opacity-0">2</span>
          <span className="text-9xl font-black text-f1red opacity-0">1</span>
        </div>
      </div>
    </div>
  );
};

export default RaceIntro;
