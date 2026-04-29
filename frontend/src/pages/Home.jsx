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

// ─── Animated speed-line background (canvas 2D) ───────────────────────────────
function SpeedLinesBg({ mouse }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Generate lines
    const lines = Array.from({ length: 60 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      len:   Math.random() * 180 + 40,
      speed: Math.random() * 0.4 + 0.1,
      alpha: Math.random() * 0.07 + 0.02,
      angle: -0.18 + (Math.random() - 0.5) * 0.08,
    }));

    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // Subtle radial gradient that follows mouse
      const mx = ((mouse.current[0] + 1) / 2) * W;
      const my = ((-mouse.current[1] + 1) / 2) * H;
      const grd = ctx.createRadialGradient(mx, my, 0, mx, my, W * 0.7);
      grd.addColorStop(0, 'rgba(225,6,0,0.04)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      lines.forEach(l => {
        // Drift
        l.x += Math.cos(l.angle) * l.speed;
        l.y += Math.sin(l.angle) * l.speed + 0.15;
        if (l.x > W + 200) l.x = -200;
        if (l.y > H + 50)  { l.y = -50; l.x = Math.random() * W; }

        // Mouse parallax — lines near cursor move slightly faster
        const dx = l.x - mx;
        const dy = l.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pull = Math.max(0, 1 - dist / 400) * 0.3;
        l.x += (dx / (dist + 1)) * pull;
        l.y += (dy / (dist + 1)) * pull;

        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle);
        const grad = ctx.createLinearGradient(0, 0, l.len, 0);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.4, `rgba(255,255,255,${l.alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(l.len, 0);
        ctx.stroke();
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────
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
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-f1red/20 to-dark-800" />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <span className="inline-block px-4 py-1 bg-f1red text-xs font-bold uppercase tracking-wider rounded-full mb-4">Featured</span>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white group-hover:text-f1red transition-colors">{post.title}</h2>
            <p className="text-gray-300 text-lg mb-4 line-clamp-2">{post.content}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>{post.author?.name || 'Unknown'}</span>
              <span>•</span>
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

// ─── Shared camera config ─────────────────────────────────────────────────────
const CAM = { position: [0, 0.8, 8], fov: 40 };  // y=0.8 looks down slightly, car appears lower
const GL  = { antialias: true, alpha: true, powerPreference: 'high-performance' };

// ─── Main ─────────────────────────────────────────────────────────────────────
const Home = () => {
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showPosts, setShowPosts] = useState(false);

  const mouse       = useRef([0, 0]);
  const clipPos     = useRef({ x: -200, y: -200 }); // off-screen initially
  const revealRef   = useRef(null);
  const cardRefs    = useRef([]);
  const lastWheel   = useRef(0);
  const touchStart  = useRef(0);
  const rafRef      = useRef(null);

  // ── Mouse tracking + clip-path update ──────────────────────────────────
  useEffect(() => {
    let targetX = -200, targetY = -200;
    let currentX = -200, currentY = -200;

    const onMove = (e) => {
      mouse.current = [
        (e.clientX / window.innerWidth)  * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      ];
      targetX = e.clientX;
      targetY = e.clientY;
    };

    // Smooth lerp for clip-path — organic ellipse, not a perfect circle
    const lerp = (a, b, t) => a + (b - a) * t;
    // Track velocity for organic wobble
    let vx = 0, vy = 0;
    const animate = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      // Spring physics — gives the reveal a fluid, organic feel
      vx += dx * 0.12;
      vy += dy * 0.12;
      vx *= 0.72;
      vy *= 0.72;
      currentX += vx;
      currentY += vy;

      // Ellipse radii — wider horizontally, taller vertically, squish based on velocity
      const speed = Math.sqrt(vx * vx + vy * vy);
      const rx = Math.max(0, 180 + speed * 3);   // wider when moving fast
      const ry = Math.max(0, 220 - speed * 2);   // taller, squishes when fast
      if (revealRef.current) {
        revealRef.current.style.clipPath =
          `ellipse(${rx}px ${ry}px at ${currentX}px ${currentY}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Fetch posts ─────────────────────────────────────────────────────────
  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await getPosts();
      setPosts(data);
    } catch {
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // ── Scroll snap ─────────────────────────────────────────────────────────
  const goToPosts = () => {
    if (showPosts) return;
    setShowPosts(true);
  };

  const goToHero = () => {
    if (!showPosts) return;
    setShowPosts(false);
  };

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

  // ── Animate post cards in ───────────────────────────────────────────────
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

      {/* ── HERO ── */}
      <AnimatePresence>
        {!showPosts && (
          <motion.div
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-black"
            style={{ zIndex: 10 }}
          >
            {/* Speed-line background — z=0, behind everything */}
            <SpeedLinesBg mouse={mouse} />

            {/* Title text — z=1, pinned to top */}
            <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-10 pointer-events-none select-none"
              style={{ zIndex: 1 }}>
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.8em' }}
                animate={{ opacity: 1, letterSpacing: '0.5em' }}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="text-f1red font-f1heading font-black text-sm uppercase mb-2"
              >
                Formula 1
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="font-f1heading font-black uppercase text-center leading-none"
                style={{
                  fontSize: 'clamp(3rem, 9vw, 8rem)',
                  background: 'linear-gradient(180deg, #ffffff 0%, #444444 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Championship
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.9 }}
                className="text-gray-500 text-sm mt-3 tracking-[0.3em] uppercase font-light"
              >
                The pinnacle of motorsport
              </motion.p>
            </div>

            {/* ── BASE LAYER: Red Bull — z=2 ── */}
            <div className="absolute inset-0" style={{ zIndex: 2 }}>
              <Canvas camera={CAM} gl={GL} style={{ background: 'transparent' }}>
                <Suspense fallback={null}>
                  <RedBullScene mouse={mouse} />
                </Suspense>
              </Canvas>
            </div>

            {/* ── REVEAL LAYER: McLaren — z=3, organic ellipse reveal ── */}
            <div
              ref={revealRef}
              className="absolute inset-0"
              style={{
                zIndex: 3,
                clipPath: 'ellipse(0px 0px at -200px -200px)',
                willChange: 'clip-path',
              }}
            >
              <Canvas camera={CAM} gl={GL} style={{ background: 'transparent' }}>
                <Suspense fallback={null}>
                  <McLarenScene mouse={mouse} />
                </Suspense>
              </Canvas>
            </div>

            {/* ── Custom cursor ring — z=20 ── */}

            {/* Hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="absolute top-6 right-8 z-20 text-xs text-gray-600 uppercase tracking-widest pointer-events-none"
            >
              Move cursor · Reveal McLaren
            </motion.div>

            {/* Scroll hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 cursor-pointer"
              onClick={goToPosts}
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="text-f1red text-2xl"
              >↓</motion.div>
              <span className="text-gray-500 text-xs uppercase tracking-widest">Scroll to explore</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── POSTS ── */}
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
                  <p className="text-gray-400 text-2xl font-light">No posts yet. Check back soon!</p>
                </div>
              ) : (
                <>
                  {posts[0] && (
                    <PostCard post={posts[0]} featured innerRef={(el) => (cardRefs.current[0] = el)} />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
                    {posts.slice(1).map((post, i) => (
                      <PostCard key={post._id} post={post} innerRef={(el) => (cardRefs.current[i + 1] = el)} />
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
