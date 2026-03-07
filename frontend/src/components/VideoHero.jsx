import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

const VideoHero = () => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    // Hero text reveal animation
    const tl = gsap.timeline({ delay: 0.5 });
    
    tl.from(titleRef.current?.children || [], {
      opacity: 0,
      y: 100,
      duration: 1.2,
      stagger: 0.15,
      ease: 'power4.out',
    })
    .from(subtitleRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.6')
    .from(ctaRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.6,
      ease: 'back.out(1.7)',
    }, '-=0.4');

    // Magnetic button effect
    const button = ctaRef.current;
    if (button) {
      const handleMouseMove = (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(button, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      const handleMouseLeave = () => {
        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.3)',
        });
      };

      button.addEventListener('mousemove', handleMouseMove);
      button.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        button.removeEventListener('mousemove', handleMouseMove);
        button.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden -mx-4">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        poster="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1920&q=80"
      >
        <source
          src="https://cdn.coverr.co/videos/coverr-racing-car-on-track-6456/1080p.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900/70 via-dark-900/80 to-dark-900"></div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
        <div className="max-w-5xl">
          <div ref={titleRef}>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 leading-none">
              <span className="block text-f1red">FORMULA 1</span>
              <span className="block text-white">CHAMPIONSHIP</span>
            </h1>
          </div>
          
          <p
            ref={subtitleRef}
            className="text-xl md:text-3xl text-gray-300 font-light mb-12 max-w-3xl mx-auto"
          >
            Experience the ultimate motorsport digital platform
          </p>

          <motion.a
            ref={ctaRef}
            href="#content"
            className="inline-block px-12 py-5 bg-f1red hover:bg-red-700 text-white font-bold text-lg rounded-full transition-colors cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore Championship
          </motion.a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
        </div>
      </motion.div>
    </div>
  );
};

export default VideoHero;
