import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import useAuth from '../hooks/useAuth';
import { getLegendImages, updateLegendImages as apiUpdateImages } from '../services/api';
import toast from 'react-hot-toast';

// ─── Legend data ──────────────────────────────────────────────────────────────
const DEFAULT_LEGENDS = [
  {
    id: 'senna', name: 'Ayrton Senna', years: '1984 – 1994', nationality: 'Brazilian',
    titles: 3, wins: 41, poles: 65, podiums: 80, fastestLaps: 19, seasons: 11,
    team: 'Toleman · Lotus · McLaren · Williams', number: '12',
    accent: '#00A651', bg: '#001a0d',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ayrton_Senna_1991_Canada.jpg/800px-Ayrton_Senna_1991_Canada.jpg',
    image2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ayrton_Senna_1993_Britain.jpg/800px-Ayrton_Senna_1993_Britain.jpg',
    quote: '"And so I arrived at that corner and for the first time I understood the true meaning of being alive."',
    legacy: [
      'Three-time World Champion (1988, 1990, 1991), Senna redefined what it meant to push a car beyond its limits.',
      'His 65 pole positions stood as the all-time record for 13 years — a testament to his supernatural qualifying pace.',
      'The rivalry with Alain Prost is the most iconic in motorsport history, splitting the paddock and the world.',
      'A fierce advocate for driver safety, his tragic death at Imola 1994 transformed F1\'s approach to circuit design forever.',
      'Decades on, he remains the benchmark of raw talent, spiritual intensity, and the purest love for driving.',
    ],
  },
  {
    id: 'schumacher', name: 'Michael Schumacher', years: '1991 – 2012', nationality: 'German',
    titles: 7, wins: 91, poles: 68, podiums: 155, fastestLaps: 77, seasons: 19,
    team: 'Jordan · Benetton · Ferrari · Mercedes', number: '1',
    accent: '#DC0000', bg: '#1a0000',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Michael_Schumacher_2012_Malaysia_FP2.jpg/800px-Michael_Schumacher_2012_Malaysia_FP2.jpg',
    image2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Michael_Schumacher_2004_Canada.jpg/800px-Michael_Schumacher_2004_Canada.jpg',
    quote: '"Once something is a passion, the motivation is there."',
    legacy: [
      'Seven World Championships — five consecutive with Ferrari (2000–2004) — a record that stood for 16 years.',
      'His 91 race victories were the all-time record until Lewis Hamilton surpassed it in 2020.',
      'Schumacher transformed Ferrari from a struggling team into the most dominant force in F1 history.',
      'Renowned for his relentless work ethic, technical feedback, and ability to perform in any conditions.',
      'His legacy is one of total dedication — a driver who gave everything to the sport he loved.',
    ],
  },
  {
    id: 'prost', name: 'Alain Prost', years: '1980 – 1993', nationality: 'French',
    titles: 4, wins: 51, poles: 33, podiums: 106, fastestLaps: 41, seasons: 13,
    team: 'McLaren · Renault · Ferrari · Williams', number: '2',
    accent: '#0055A4', bg: '#00001a',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Alain_Prost_1990_Canada.jpg/800px-Alain_Prost_1990_Canada.jpg',
    image2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Alain_Prost_1986_Canada.jpg/800px-Alain_Prost_1986_Canada.jpg',
    quote: '"To achieve anything in this game you must be prepared to dabble in the boundary of disaster."',
    legacy: [
      'Four-time World Champion, Prost earned the nickname "The Professor" for his cerebral, calculated approach.',
      'His 51 victories were the all-time record when he retired in 1993, a mark that stood for nearly a decade.',
      'The Prost–Senna rivalry defined an era — two contrasting philosophies of racing at the absolute limit.',
      'Prost\'s ability to manage tyres, fuel, and race pace was unmatched, winning races with surgical precision.',
      'He remains the gold standard for intelligent, strategic racing — proof that the mind is the fastest tool.',
    ],
  },
  {
    id: 'lauda', name: 'Niki Lauda', years: '1971 – 1985', nationality: 'Austrian',
    titles: 3, wins: 25, poles: 24, podiums: 54, fastestLaps: 24, seasons: 14,
    team: 'BRM · March · Ferrari · Brabham · McLaren', number: '1',
    accent: '#EF3340', bg: '#1a0005',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Niki_Lauda_1974_adjusted.jpg/800px-Niki_Lauda_1974_adjusted.jpg',
    image2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Niki_Lauda_1976_Canada.jpg/800px-Niki_Lauda_1976_Canada.jpg',
    quote: '"I was never afraid of the car. I was afraid of myself — of making a mistake."',
    legacy: [
      'Three-time World Champion whose 1976 comeback from near-fatal burns at the Nürburgring is the greatest story in sport.',
      'Lauda returned to racing just 40 days after his accident, losing the title to Hunt by a single point.',
      'His technical mastery and blunt honesty revolutionised how drivers communicated with engineers.',
      'A second title in 1977 and a third with McLaren in 1984 proved his crash was merely a chapter, not the end.',
      'Lauda\'s courage, pragmatism, and refusal to be defined by tragedy make him the most human of all champions.',
    ],
  },
  {
    id: 'fangio', name: 'Juan Manuel Fangio', years: '1950 – 1958', nationality: 'Argentine',
    titles: 5, wins: 24, poles: 29, podiums: 35, fastestLaps: 23, seasons: 9,
    team: 'Alfa Romeo · Maserati · Mercedes · Ferrari', number: '1',
    accent: '#74ACDF', bg: '#00081a',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Juan_Manuel_Fangio_1952.jpg/800px-Juan_Manuel_Fangio_1952.jpg',
    image2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Juan_Manuel_Fangio_1955_Nurburgring.jpg/800px-Juan_Manuel_Fangio_1955_Nurburgring.jpg',
    quote: '"I have no idols. I admire work, dedication and competence."',
    legacy: [
      'Five World Championships across four different constructors — a feat of adaptability never matched in F1 history.',
      'Fangio\'s win rate of 46.15% remains the highest of any driver with significant starts in Formula 1.',
      'He drove for Alfa Romeo, Ferrari, Maserati, and Mercedes — mastering each car with equal brilliance.',
      'His 1957 German Grand Prix comeback at the Nürburgring is widely considered the greatest drive in F1 history.',
      'The original legend — Fangio set the template for what a Formula 1 World Champion should be.',
    ],
  },
  {
    id: 'clark', name: 'Jim Clark', years: '1960 – 1968', nationality: 'Scottish',
    titles: 2, wins: 25, poles: 33, podiums: 32, fastestLaps: 28, seasons: 9,
    team: 'Lotus', number: '1',
    accent: '#FFD700', bg: '#1a1400',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Jim_Clark_1965_Brands_Hatch.jpg/800px-Jim_Clark_1965_Brands_Hatch.jpg',
    image2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Jim_Clark_1967_Zandvoort.jpg/800px-Jim_Clark_1967_Zandvoort.jpg',
    quote: '"I\'ve never been frightened in a racing car. I\'ve been surprised, but never frightened."',
    legacy: [
      'Two-time World Champion (1963, 1965) who was universally regarded as the most naturally gifted driver of his era.',
      'Clark won 25 of his 72 starts — a staggering 34.7% win rate that reflects his total dominance.',
      'His 1965 season was perfection: he won the championship, the Indianapolis 500, and the Tasman Series.',
      'Partnered with Colin Chapman at Lotus, Clark pushed the boundaries of what was technically possible.',
      'His death at Hockenheim in 1968 shocked the world — the sport lost its purest talent far too soon.',
    ],
  },
];

// ─── Two-face 3D flip card ────────────────────────────────────────────────────
// Tilting left (rotateY < -6) shows image2, tilting right shows image1
const TiltCard = ({ legend }) => {
  const wrapRef = useRef(null);   // perspective wrapper
  const cardRef = useRef(null);   // the card that tilts
  const front = useRef(null);     // front face img
  const back = useRef(null);      // back face img
  const shineRef = useRef(null);
  const glowRef = useRef(null);
  const rafRef = useRef(null);
  const rotYRef = useRef(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onMove = (e) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        const rotY = dx * 38;   // wider range so flip is reachable
        const rotX = -dy * 14;
        rotYRef.current = rotY;

        gsap.to(card, { rotateX: rotX, rotateY: rotY, duration: 0.3, ease: 'power2.out' });

        // Cross-fade faces based on tilt direction
        const showBack = rotY < -8;
        gsap.to(front.current, { opacity: showBack ? 0 : 1, duration: 0.25 });
        gsap.to(back.current,  { opacity: showBack ? 1 : 0, duration: 0.25 });

        // Shine
        const sx = ((e.clientX - rect.left) / rect.width) * 100;
        const sy = ((e.clientY - rect.top) / rect.height) * 100;
        if (shineRef.current)
          shineRef.current.style.background = `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.13) 0%, transparent 55%)`;

        // Glow
        if (glowRef.current)
          gsap.to(glowRef.current, { x: e.clientX - rect.left - 150, y: e.clientY - rect.top - 150, duration: 0.5, ease: 'power2.out' });
      });
    };

    const onLeave = () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1,0.5)' });
      gsap.to(front.current, { opacity: 1, duration: 0.4 });
      gsap.to(back.current,  { opacity: 0, duration: 0.4 });
      if (shineRef.current) shineRef.current.style.background = 'none';
    };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    return () => {
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [legend.id]);

  return (
    <div ref={wrapRef} style={{ perspective: '900px' }} className="flex justify-center">
      <motion.div
        ref={cardRef}
        key={legend.id}
        initial={{ opacity: 0, y: 50, rotateY: -20 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        exit={{ opacity: 0, y: -50, rotateY: 20 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-72 md:w-80 rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 50px ${legend.accent}44`,
          border: `1px solid ${legend.accent}55`,
          height: '480px',
        }}
      >
        {/* Glow blob */}
        <div ref={glowRef} className="absolute w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${legend.accent}35 0%, transparent 70%)`, filter: 'blur(28px)', zIndex: 1 }} />

        {/* FRONT face */}
        <div ref={front} className="absolute inset-0">
          <img src={legend.image} alt={legend.name}
            className="w-full h-full object-cover object-top scale-110"
            style={{ willChange: 'transform' }} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${legend.bg}ff 0%, ${legend.bg}88 40%, transparent 100%)` }} />
        </div>

        {/* BACK face */}
        <div ref={back} className="absolute inset-0" style={{ opacity: 0 }}>
          <img src={legend.image2 || legend.image} alt={`${legend.name} alt`}
            className="w-full h-full object-cover object-top scale-110"
            style={{ willChange: 'transform' }} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${legend.bg}ff 0%, ${legend.bg}88 40%, transparent 100%)` }} />
          {/* "flip" label */}
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold z-10"
            style={{ background: `${legend.accent}33`, color: legend.accent, border: `1px solid ${legend.accent}55` }}>
            ← flip
          </div>
        </div>

        {/* Shine overlay */}
        <div ref={shineRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }} />

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-1" style={{ color: legend.accent }}>{legend.nationality}</p>
              <h2 className="font-f1heading font-black text-3xl text-white leading-none">{legend.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{legend.years}</p>
            </div>
            <div className="text-6xl font-f1heading font-black leading-none opacity-15" style={{ color: legend.accent }}>{legend.number}</div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {[{ l: '🏆', v: `${legend.titles}× WDC` }, { l: '🏁', v: `${legend.wins} Wins` }, { l: '⚡', v: `${legend.poles} Poles` }].map(s => (
              <span key={s.l} className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: `${legend.accent}22`, color: legend.accent, border: `1px solid ${legend.accent}44` }}>
                {s.l} {s.v}
              </span>
            ))}
          </div>
          {/* Flip hint */}
          <p className="text-xs mt-2 opacity-40" style={{ color: legend.accent }}>← tilt left to flip card</p>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Stat counter ─────────────────────────────────────────────────────────────
const StatItem = ({ label, value, color, delay }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { textContent: 0 },
      { textContent: value, duration: 1.8, delay, ease: 'power2.out', snap: { textContent: 1 },
        onUpdate() { if (ref.current) ref.current.textContent = Math.ceil(this.targets()[0].textContent); } });
  }, [value]);
  return (
    <div className="text-center">
      <div className="text-2xl font-f1heading font-black" style={{ color }}><span ref={ref}>{value}</span></div>
      <div className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">{label}</div>
    </div>
  );
};

// ─── Admin image upload modal ─────────────────────────────────────────────────
const ImageUploadModal = ({ legend, onSave, onClose }) => {
  const [img1, setImg1] = useState(legend.image);
  const [img2, setImg2] = useState(legend.image2 || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-md mx-4"
        style={{ border: `1px solid ${legend.accent}44` }}>
        <h3 className="font-f1heading font-black text-xl mb-1" style={{ color: legend.accent }}>
          Edit Images — {legend.name}
        </h3>
        <p className="text-gray-500 text-xs mb-5">Paste direct image URLs (Wikipedia, Wikimedia, etc.)</p>

        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Front image URL</label>
        <input value={img1} onChange={e => setImg1(e.target.value)}
          className="w-full px-3 py-2 bg-dark-800 border border-gray-700 rounded-lg text-sm mb-1 focus:outline-none focus:border-f1red"
          placeholder="https://..." />
        {img1 && <img src={img1} alt="preview" className="w-full h-28 object-cover rounded-lg mb-4 opacity-70" onError={e => e.target.style.display='none'} />}

        <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Back image URL (flip side)</label>
        <input value={img2} onChange={e => setImg2(e.target.value)}
          className="w-full px-3 py-2 bg-dark-800 border border-gray-700 rounded-lg text-sm mb-1 focus:outline-none focus:border-f1red"
          placeholder="https://..." />
        {img2 && <img src={img2} alt="preview2" className="w-full h-28 object-cover rounded-lg mb-4 opacity-70" onError={e => e.target.style.display='none'} />}

        <div className="flex gap-3 mt-2">
          <button onClick={() => onSave(img1, img2)}
            className="flex-1 py-2 rounded-lg font-bold text-sm transition"
            style={{ background: legend.accent, color: '#000' }}>
            Save
          </button>
          <button onClick={onClose}
            className="px-6 py-2 rounded-lg font-bold text-sm bg-gray-800 hover:bg-gray-700 transition">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Legends = () => {
  const { isAdmin } = useAuth();
  const [legends, setLegends] = useState(DEFAULT_LEGENDS);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const bgRef = useRef(null);
  const lastWheelTime = useRef(0);
  const touchStartY = useRef(0);

  const legend = legends[current];

  // Load image overrides from DB and merge into defaults
  useEffect(() => {
    getLegendImages()
      .then(({ data }) => {
        if (!data.length) return;
        setLegends(prev =>
          prev.map(l => {
            const override = data.find(d => d.legendId === l.id);
            if (!override) return l;
            return {
              ...l,
              ...(override.image  ? { image:  override.image  } : {}),
              ...(override.image2 ? { image2: override.image2 } : {}),
            };
          })
        );
      })
      .catch(() => {}); // silently fall back to defaults
  }, []);

  useEffect(() => {
    if (bgRef.current)
      gsap.to(bgRef.current, { backgroundColor: legend.bg, duration: 0.9, ease: 'power2.inOut' });
  }, [current, legend.bg]);

  const goTo = useCallback((next) => {
    if (transitioning || next < 0 || next >= legends.length) return;
    setTransitioning(true);
    setDirection(next > current ? 1 : -1);
    setCurrent(next);
    setTimeout(() => setTransitioning(false), 750);
  }, [current, transitioning, legends.length]);

  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < 800) return;
      lastWheelTime.current = now;
      goTo(e.deltaY > 0 ? current + 1 : current - 1);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [current, goTo]);

  useEffect(() => {
    const onTS = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTE = (e) => {
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    };
    window.addEventListener('touchstart', onTS);
    window.addEventListener('touchend', onTE);
    return () => { window.removeEventListener('touchstart', onTS); window.removeEventListener('touchend', onTE); };
  }, [current, goTo]);

  const handleSaveImages = async (img1, img2) => {
    const legendId = legends[editingIdx].id;
    try {
      await apiUpdateImages(legendId, { image: img1, image2: img2 });
      setLegends(prev => prev.map((l, i) => i === editingIdx ? { ...l, image: img1, image2: img2 } : l));
      toast.success('Images saved');
    } catch {
      toast.error('Failed to save images');
    }
    setEditingIdx(null);
  };

  const contentVariants = {
    enter: (d) => ({ opacity: 0, y: d > 0 ? 40 : -40 }),
    center: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    exit: (d) => ({ opacity: 0, y: d > 0 ? -40 : 40, transition: { duration: 0.4 } }),
  };

  return (
    <>
      {editingIdx !== null && (
        <ImageUploadModal
          legend={legends[editingIdx]}
          onSave={handleSaveImages}
          onClose={() => setEditingIdx(null)}
        />
      )}

      <div ref={bgRef} className="fixed inset-0 overflow-hidden" style={{ backgroundColor: legend.bg, top: '64px' }}>
        {/* Decorative bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.04]"
            style={{ background: `repeating-linear-gradient(-55deg, ${legend.accent} 0px, ${legend.accent} 2px, transparent 2px, transparent 40px)` }} />
          <motion.div key={legend.id + '-glow'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
            className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full blur-3xl opacity-10"
            style={{ background: legend.accent }} />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="px-8 pt-5 pb-2 flex items-center justify-between shrink-0">
            <div>
              <p className="text-xs font-bold tracking-[0.4em] uppercase" style={{ color: legend.accent }}>F1 Legends</p>
              <h1 className="font-f1heading font-black text-4xl md:text-5xl uppercase leading-none mt-1">
                <span style={{ color: legend.accent }}>Hall</span> <span className="text-white">of Fame</span>
              </h1>
            </div>
            <div className="flex flex-col gap-2 items-center">
              {legends.map((l, i) => (
                <button key={l.id} onClick={() => goTo(i)}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{ background: i === current ? legend.accent : 'rgba(255,255,255,0.2)', transform: i === current ? 'scale(1.5)' : 'scale(1)' }} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 px-8 pb-4 items-center overflow-hidden">

            {/* Card */}
            <div className="relative">
              <AnimatePresence mode="wait" custom={direction}>
                <TiltCard key={legend.id} legend={legend} />
              </AnimatePresence>
              {/* Admin edit button */}
              {isAdmin && isAdmin() && (
                <button onClick={() => setEditingIdx(current)}
                  className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold z-20 transition"
                  style={{ background: `${legend.accent}22`, color: legend.accent, border: `1px solid ${legend.accent}55` }}>
                  ✎ Edit Images
                </button>
              )}
            </div>

            {/* Text content */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={legend.id + '-content'} custom={direction}
                variants={contentVariants} initial="enter" animate="center" exit="exit"
                className="flex flex-col gap-4 overflow-y-auto max-h-full pr-1"
                style={{ scrollbarWidth: 'none' }}
              >
                {/* Quote */}
                <blockquote className="pl-4 border-l-4" style={{ borderColor: legend.accent }}>
                  <p className="text-gray-200 text-base italic leading-relaxed font-light drop-shadow-lg">{legend.quote}</p>
                </blockquote>

                {/* Legacy — dark backdrop for readability */}
                <div className="space-y-2.5 rounded-xl p-4"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
                  {legend.legacy.map((para, i) => (
                    <p key={i} className="text-gray-200 leading-relaxed text-sm">
                      <span className="font-bold mr-1" style={{ color: legend.accent }}>›</span>
                      {para}
                    </p>
                  ))}
                </div>

                {/* Stats */}
                <div className="glass glass-legend rounded-2xl p-4"
                  style={{ borderColor: `${legend.accent}33`, '--legend-accent-shadow': `${legend.accent}33` }}>
                  <p className="text-xs font-bold tracking-[0.3em] uppercase mb-3 text-gray-400">Career Statistics</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Championships', value: legend.titles },
                      { label: 'Race Wins', value: legend.wins },
                      { label: 'Pole Positions', value: legend.poles },
                      { label: 'Podiums', value: legend.podiums },
                      { label: 'Fastest Laps', value: legend.fastestLaps },
                      { label: 'Seasons', value: legend.seasons },
                    ].map((s, i) => (
                      <StatItem key={`${legend.id}-${s.label}`} label={s.label} value={s.value} color={legend.accent} delay={i * 0.08} />
                    ))}
                  </div>
                </div>

                {/* Team + scroll hint */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500 text-xs uppercase tracking-widest">Teams</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${legend.accent}18`, color: legend.accent, border: `1px solid ${legend.accent}40` }}>
                      {legend.team}
                    </span>
                  </div>
                  <div className="text-xs flex flex-col items-center gap-1" style={{ color: legend.accent }}>
                    {current < legends.length - 1 ? (
                      <>
                        <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>↓</motion.div>
                        <span className="text-gray-500">scroll for next</span>
                      </>
                    ) : (
                      <span className="text-gray-700">— end —</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-gray-900 shrink-0">
            <motion.div className="h-full" style={{ background: legend.accent }}
              animate={{ width: `${((current + 1) / legends.length) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeInOut' }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Legends;
