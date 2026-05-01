import { useState, useEffect, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { getPosts } from '../services/api';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RedBullScene, McLarenScene } from '../components/F1CarScene';

gsap.registerPlugin(ScrollTrigger);

/* ─── Post card ─────────────────────────────────────────────────────────────── */
const PostCard = ({ post, featured = false, innerRef }) => (
  <div ref={innerRef}>
    <Link to={`/posts/${post._id}`}>
      {featured ? (
        <div className="relative group overflow-hidden rounded-2xl h-[500px]">
          {post.imageUrl ? (
            <>
              <img src={post.imageUrl} alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/60 to-transparent" />
            </>
          ) : <div className="w-full h-full bg-gradient-to-br from-f1red/20 to-dark-800" />}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <span className="inline-block px-4 py-1 bg-f1red text-xs font-bold uppercase tracking-wider rounded-full mb-4">Featured</span>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white group-hover:text-f1red transition-colors">{post.title}</h2>
            <p className="text-gray-300 text-lg mb-4 line-clamp-2">{post.content}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>{post.author?.name || 'Unknown'}</span><span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="group h-full">
          <div className="relative overflow-hidden rounded-xl mb-4 aspect-video">
            {post.imageUrl ? (
              <>
                <img src={post.imageUrl} alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-dark-800 flex items-center justify-center">
                <span className="text-6xl">🏎️</span>
              </div>
            )}
          </div>
          <div className="glass rounded-xl p-6 hover:border-f1red transition-all duration-300">
            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-f1red transition-colors line-clamp-2">{post.title}</h3>
            <p className="text-gray-400 mb-4 line-clamp-3 text-sm">{post.content}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{post.author?.name || 'Unknown'}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </Link>
  </div>
);

const CAM = { position: [0, 0.8, 8], fov: 40 };
const GL  = { antialias: true, alpha: true, powerPreference: 'high-performance' };

/* ─── WebGL metaball mask ────────────────────────────────────────────────────
   A tiny WebGL canvas sits on top of everything (pointer-events:none).
   Its fragment shader evaluates the metaball scalar field for every pixel
   and outputs alpha=1 where the field exceeds the threshold, alpha=0 elsewhere.
   That canvas is then used as a CSS mask-image on the McLaren layer.

   We update the mask every frame by:
     1. Uploading blob positions/radii/strengths as a uniform array
     2. Drawing a full-screen quad — the shader does all the work on the GPU
     3. Using the canvas element directly as mask via CSS element() — but that's
        Firefox-only. Instead we use a shared OffscreenCanvas approach.

   Actually the cleanest cross-browser solution:
     - The WebGL canvas IS the mask canvas (transparent bg, white where blobs are)
     - We set it as mask-image via a Blob URL created once, then update it...
     - Still requires toDataURL or ImageBitmap transfer.

   REAL solution: render the McLaren layer ONTO the WebGL canvas as a texture,
   composite it with the metaball mask in the shader, output the final pixel.
   But that requires capturing the Three.js canvas as a texture — complex.

   SIMPLEST CORRECT SOLUTION that actually works:
     - Use a 2D canvas for the mask (fast enough at half resolution)
     - Draw blobs as filled white circles (no gradients, just solid)
     - Apply a one-time CSS filter: blur(Xpx) to the CANVAS ELEMENT ITSELF
       (not the wrapper) — this blurs the hard circles into soft blobs
     - Use that canvas as mask-image via toDataURL... still slow.

   THE ACTUAL CORRECT SOLUTION:
     - Don't use CSS mask at all.
     - Use a SINGLE canvas that draws BOTH layers:
         * Fill with Red Bull colors / draw Red Bull content as ImageBitmap
         * Draw McLaren content as ImageBitmap  
         * Use globalCompositeOperation to composite them with metaball mask
     - But capturing Three.js canvases as ImageBitmap requires preserveDrawingBuffer.

   ✅ FINAL APPROACH (what actually works, no hacks):
     - Red Bull layer: normal div, z=1
     - McLaren layer: normal div, z=2, initially hidden (opacity:0, pointerEvents:none)
     - Mask canvas: z=3, pointer-events:none, VISIBLE, draws the metaball shape
       in McLaren orange color directly — so it LOOKS like the McLaren layer
       is being revealed, but it's actually just painting orange blobs on top
       of the Red Bull layer.
     - The 3D McLaren car is rendered in a canvas that is CLIPPED by the mask
       using clip-path:circle() that follows the cursor — simple, reliable.

   ✅✅ EVEN SIMPLER — what Lando Norris actually does:
     The "liquid" is just a large smooth circle/blob that follows the cursor
     with spring physics (lagging behind), revealing the second layer.
     It's NOT complex metaballs. It's one smooth organic shape with spring easing.
     We implement this with a spring-animated clip-path circle on the McLaren layer.
────────────────────────────────────────────────────────────────────────────── */

/* Spring physics for smooth cursor following */
function useSpring(stiffness = 0.08, damping = 0.75) {
  const state = useRef({ x: -300, y: -300, vx: 0, vy: 0, tx: -300, ty: -300 });
  return state;
}

/* ─── Liquid Hero ─────────────────────────────────────────────────────────── */
function LiquidHero({ onScrollDown }) {
  const mouse3d    = useRef([0, 0]);
  const mclarenRef = useRef(null);
  const rafRef     = useRef(null);
  const aliveRef   = useRef(true);
  const spring     = useSpring();
  // Track multiple blob points for the organic shape
  const trailRef   = useRef([]);

  /* 3D parallax */
  useEffect(() => {
    const fn = (e) => {
      mouse3d.current = [
        (e.clientX / window.innerWidth)  * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      ];
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  /* Liquid reveal engine */
  useEffect(() => {
    aliveRef.current = true;
    const mclaren = mclarenRef.current;
    if (!mclaren) return;

    const s = spring.current;
    s.x = -300; s.y = -300; s.vx = 0; s.vy = 0; s.tx = -300; s.ty = -300;

    let lastMoveTime = 0;          // timestamp of last mousemove
    let globalScale  = 0;          // 0 = fully hidden, 1 = fully visible

    const onMove = (e) => {
      s.tx = e.clientX;
      s.ty = e.clientY;
      lastMoveTime = Date.now();
    };
    window.addEventListener('mousemove', onMove);

    // Trail: array of {x, y, r, age} — older points shrink
    const trail = trailRef.current;
    trail.length = 0;
    let lastTrailX = -9999, lastTrailY = -9999;

    const IDLE_MS = 300; // ms of no movement before blob starts shrinking

    const tick = () => {
      if (!aliveRef.current) return;

      // Fade globalScale in/out based on mouse activity
      const idle = Date.now() - lastMoveTime > IDLE_MS;
      globalScale += idle ? -0.06 : 0.08;
      globalScale  = Math.max(0, Math.min(1, globalScale));

      // Spring physics — smooth lag behind cursor
      s.vx += (s.tx - s.x) * 0.09;
      s.vy += (s.ty - s.y) * 0.09;
      s.vx *= 0.78;
      s.vy *= 0.78;
      s.x  += s.vx;
      s.y  += s.vy;

      // Add trail point when spring head moves enough
      const dx = s.x - lastTrailX;
      const dy = s.y - lastTrailY;
      if (Math.sqrt(dx * dx + dy * dy) > 12) {
        trail.push({ x: s.x, y: s.y, r: 1.0, age: 0 });
        lastTrailX = s.x;
        lastTrailY = s.y;
        if (trail.length > 18) trail.shift();
      }

      // Age trail points
      for (const p of trail) p.age += 0.025;

      // Hide McLaren layer entirely when fully faded out (so Red Bull shows through)
      if (globalScale <= 0) {
        mclaren.style.opacity = '0';
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      mclaren.style.opacity = '1';

      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      // Reduced base size (was 130), scaled by globalScale for fade in/out
      const baseR = Math.min(160, 90 + speed * 6) * globalScale;

      // Build a smooth SVG clip path using ellipses merged via feBlend
      // Actually: use a single clip-path with multiple circles via SVG clipPath
      // The browser merges overlapping clip regions automatically → organic shape

      // Generate SVG clipPath string
      let circles = '';
      // Main head circle
      circles += `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${baseR.toFixed(1)}"/>`;
      // Trail circles — decreasing size
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        const age = trail.length - 1 - i; // 0 = newest
        const maxAge = trail.length;
        const t = age / maxAge;
        const r = baseR * (1 - t * 0.65) * Math.max(0, 1 - p.age * 0.4);
        if (r < 5) continue;
        circles += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}"/>`;
      }

      const W = window.innerWidth;
      const H = window.innerHeight;

      // SVG with feMorphology to smooth/merge the circles
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
        <defs>
          <filter id="blob" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur"/>
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -10"
              result="goo"/>
          </filter>
        </defs>
        <g filter="url(#blob)" fill="white">${circles}</g>
      </svg>`;

      const encoded = 'data:image/svg+xml;base64,' + btoa(svg);
      mclaren.style.webkitMaskImage = `url("${encoded}")`;
      mclaren.style.maskImage       = `url("${encoded}")`;
      mclaren.style.webkitMaskSize  = `${W}px ${H}px`;
      mclaren.style.maskSize        = `${W}px ${H}px`;
      mclaren.style.webkitMaskRepeat = 'no-repeat';
      mclaren.style.maskRepeat       = 'no-repeat';

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMove);
      trailRef.current = [];
      if (mclaren) {
        mclaren.style.opacity         = '0';
        mclaren.style.webkitMaskImage = 'none';
        mclaren.style.maskImage       = 'none';
      }
    };
  }, []);

  return (
    <div className="fixed inset-0" style={{ zIndex: 10 }}>

      {/* ── Layer 1: Red Bull — dark base ── */}
      <div className="absolute inset-0 bg-black" style={{ zIndex: 1 }}>
        <Canvas camera={CAM} gl={GL} style={{ background: 'transparent' }}>
          <Suspense fallback={null}><RedBullScene mouse={mouse3d} /></Suspense>
        </Canvas>

        <div className="absolute inset-0 flex flex-col items-center justify-start pt-10 pointer-events-none select-none">
          <motion.p
            initial={{ opacity: 0, letterSpacing: '0.8em' }}
            animate={{ opacity: 1, letterSpacing: '0.5em' }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="text-f1red font-f1heading font-black text-sm uppercase mb-2"
          >Formula 1</motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="font-f1heading font-black uppercase text-center leading-none"
            style={{
              fontSize: 'clamp(3rem, 9vw, 8rem)',
              background: 'linear-gradient(180deg,#fff 0%,#555 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >Championship</motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="text-gray-500 text-sm mt-3 tracking-[0.3em] uppercase font-light"
          >The pinnacle of motorsport</motion.p>
        </div>
      </div>

      {/* ── Layer 2: McLaren — orange, revealed by SVG blob mask ── */}
      <div
        ref={mclarenRef}
        className="absolute inset-0"
        style={{
          zIndex: 2,
          background: '#FF8000',
          WebkitMaskImage: 'none',
          maskImage: 'none',
          opacity: 0,
          willChange: 'mask-image, opacity',
        }}
      >
        <Canvas camera={CAM} gl={GL} style={{ background: 'transparent' }}>
          <Suspense fallback={null}><McLarenScene mouse={mouse3d} /></Suspense>
        </Canvas>

        {/* Black text on orange */}
        <div className="absolute inset-0 flex flex-col items-center justify-start pt-10 pointer-events-none select-none">
          <p className="font-f1heading font-black text-sm uppercase mb-2 tracking-[0.5em]"
            style={{ color: '#000' }}>Formula 1</p>
          <h1
            className="font-f1heading font-black uppercase text-center leading-none"
            style={{ fontSize: 'clamp(3rem, 9vw, 8rem)', color: '#000' }}
          >Championship</h1>
          <p className="text-sm mt-3 tracking-[0.3em] uppercase font-light"
            style={{ color: '#111' }}>The pinnacle of motorsport</p>
        </div>
      </div>

      {/* Hint */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        className="absolute top-6 right-8 text-xs text-gray-500 uppercase tracking-widest pointer-events-none"
        style={{ zIndex: 20 }}
      >
        Move cursor · Reveal McLaren
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
        style={{ zIndex: 20 }}
        onClick={onScrollDown}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="text-f1red text-2xl"
        >↓</motion.div>
        <span className="text-gray-500 text-xs uppercase tracking-widest">Scroll to explore</span>
      </motion.div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
const Home = () => {
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showPosts, setShowPosts] = useState(false);

  const cardRefs   = useRef([]);
  const lastWheel  = useRef(0);
  const touchStart = useRef(0);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try { const { data } = await getPosts(); setPosts(data); }
    catch { toast.error('Failed to fetch posts'); }
    finally { setLoading(false); }
  };

  const goToPosts = () => setShowPosts(true);
  const goToHero  = () => setShowPosts(false);

  useEffect(() => {
    const onWheel = (e) => {
      const now = Date.now();
      if (now - lastWheel.current < 900) return;
      lastWheel.current = now;
      if (!showPosts && e.deltaY > 30) goToPosts();
      if (showPosts  && e.deltaY < -30) goToHero();
    };
    const onTS = (e) => { touchStart.current = e.touches[0].clientY; };
    const onTE = (e) => {
      const diff = touchStart.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) < 40) return;
      if (!showPosts && diff > 0) goToPosts();
      if (showPosts  && diff < 0) goToHero();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTS);
    window.addEventListener('touchend', onTE);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTS);
      window.removeEventListener('touchend', onTE);
    };
  }, [showPosts]);

  useEffect(() => {
    if (showPosts && !loading && cardRefs.current.length) {
      gsap.fromTo(
        cardRefs.current.filter(Boolean),
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, [showPosts, loading]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>

      <AnimatePresence>
        {!showPosts && (
          <motion.div
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          >
            <LiquidHero onScrollDown={goToPosts} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPosts && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-dark-900 overflow-y-auto"
            style={{ zIndex: 10 }}
          >
            <button
              onClick={goToHero}
              className="fixed top-20 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition"
              style={{ background: 'rgba(225,6,0,0.15)', color: '#E10600', border: '1px solid rgba(225,6,0,0.3)' }}
            >
              ↑ Back to car
            </button>

            <div className="max-w-7xl mx-auto py-16 px-4">
              <div className="mb-12">
                <p className="text-f1red font-f1heading font-bold tracking-[0.3em] text-sm uppercase mb-2">Latest</p>
                <h2 className="font-f1heading font-black text-5xl uppercase">News &amp; Updates</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-f1red" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-f1red font-bold">F1</span>
                    </div>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🏁</div>
                  <p className="text-gray-400 text-2xl font-light">No posts yet.</p>
                </div>
              ) : (
                <>
                  {posts[0] && (
                    <PostCard post={posts[0]} featured innerRef={(el) => (cardRefs.current[0] = el)} />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
                    {posts.slice(1).map((post, i) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        innerRef={(el) => (cardRefs.current[i + 1] = el)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
