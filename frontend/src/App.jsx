import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import ChampionshipDashboard from './pages/ChampionshipDashboard';
import DriverStandings from './pages/DriverStandings';
import ConstructorStandings from './pages/ConstructorStandings';
import ManageDrivers from './pages/ManageDrivers';
import ManageConstructors from './pages/ManageConstructors';
import ManageRaces from './pages/ManageRaces';
import EditRace from './pages/EditRace';
import EditRaceResults from './pages/EditRaceResults';
import CircuitsMap from './pages/CircuitsMap';
import Legends from './pages/Legends';
import LiquidHero from './pages/LiquidHero';
import LiquidHeroConfigurable from './pages/LiquidHeroConfigurable';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import LoadingScreen from './components/LoadingScreen';

// Legend images to preload
const LEGEND_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ayrton_Senna_1991_Canada.jpg/800px-Ayrton_Senna_1991_Canada.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ayrton_Senna_1993_Britain.jpg/800px-Ayrton_Senna_1993_Britain.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Michael_Schumacher_2012_Malaysia_FP2.jpg/800px-Michael_Schumacher_2012_Malaysia_FP2.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Michael_Schumacher_2004_Canada.jpg/800px-Michael_Schumacher_2004_Canada.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Alain_Prost_1990_Canada.jpg/800px-Alain_Prost_1990_Canada.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Alain_Prost_1986_Canada.jpg/800px-Alain_Prost_1986_Canada.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Niki_Lauda_1974_adjusted.jpg/800px-Niki_Lauda_1974_adjusted.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Niki_Lauda_1976_Canada.jpg/800px-Niki_Lauda_1976_Canada.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Juan_Manuel_Fangio_1952.jpg/800px-Juan_Manuel_Fangio_1952.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Juan_Manuel_Fangio_1955_Nurburgring.jpg/800px-Juan_Manuel_Fangio_1955_Nurburgring.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Jim_Clark_1965_Brands_Hatch.jpg/800px-Jim_Clark_1965_Brands_Hatch.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Jim_Clark_1967_Zandvoort.jpg/800px-Jim_Clark_1967_Zandvoort.jpg',
];

function AppContent() {
  const location    = useLocation();
  const isFirstLoad = useRef(true);
  const [isLoading, setIsLoading]     = useState(true);
  const [glbReady, setGlbReady]       = useState(false);
  const [windowReady, setWindowReady] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);

  // Track Three.js / GLB loading progress via drei's useProgress
  const { progress: glbProgress, active } = useProgress();

  // Preload legend images on mount with per-image and overall timeouts
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = LEGEND_IMAGES.length;
    let isMounted = true;

    if (totalImages === 0) {
      setImagesReady(true);
      return;
    }

    const checkComplete = () => {
      loadedCount++;
      if (isMounted) {
        setImageProgress(Math.floor((loadedCount / totalImages) * 100));
        if (loadedCount >= totalImages) {
          setImagesReady(true);
        }
      }
    };

    LEGEND_IMAGES.forEach(src => {
      const img = new Image();
      const timer = setTimeout(checkComplete, 1200);
      img.onload = () => { clearTimeout(timer); checkComplete(); };
      img.onerror = () => { clearTimeout(timer); checkComplete(); };
      img.src = src;
    });

    // Hard fallback: images marked ready within 1.5s max
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setImageProgress(100);
        setImagesReady(true);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  const [timeProgress, setTimeProgress] = useState(0);

  // Smooth time-based progress ticker to ensure steady progression
  useEffect(() => {
    const started = Date.now();
    const DURATION = 2200;
    const interval = setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, Math.floor((elapsed / DURATION) * 100));
      setTimeProgress(pct);
      if (pct >= 100) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // GLBs done when progress hits 100 and loader is no longer active
    if (glbProgress >= 100 && !active) setGlbReady(true);
    // Hard fallback: GLBs marked ready within 1.5s max
    const t = setTimeout(() => setGlbReady(true), 1500);
    return () => clearTimeout(t);
  }, [glbProgress, active]);

  // Window load event with guaranteed completion
  useEffect(() => {
    const MIN_DURATION = 1800;
    const started = Date.now();

    const finish = () => {
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, MIN_DURATION - elapsed);
      setTimeout(() => setWindowReady(true), remaining);
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }

    const fallback = setTimeout(() => setWindowReady(true), 2500);
    return () => {
      window.removeEventListener('load', finish);
      clearTimeout(fallback);
    };
  }, []);

  // Hide loading screen when resources are ready or timeProgress reaches 100
  useEffect(() => {
    if ((windowReady && glbReady && imagesReady) || timeProgress >= 100) {
      setIsLoading(false);
    }
  }, [windowReady, glbReady, imagesReady, timeProgress]);

  // Absolute failsafe: loading screen will NEVER stay longer than 2.8s
  useEffect(() => {
    const failsafe = setTimeout(() => {
      setIsLoading(false);
    }, 2800);
    return () => clearTimeout(failsafe);
  }, []);

  // Calculate combined progress percentage for loading screen
  const effectiveGlb = glbReady ? 100 : glbProgress;
  const resourceProgress = (effectiveGlb * 0.4) + (imageProgress * 0.3) + (windowReady ? 30 : 0);
  const loadPercent = !isLoading
    ? 100
    : Math.min(100, Math.round(Math.max(resourceProgress, timeProgress)));

  // Route changes after first load — no full loading screen
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
  }, [location.pathname]);

  return (
    <>
      <LoadingScreen isLoading={isLoading} loadPercent={loadPercent} />
      <Routes>
        {/* Liquid Hero - Full screen, no layout */}
        <Route path="/liquid-hero" element={<LiquidHero />} />
        <Route path="/liquid-hero-config" element={<LiquidHeroConfigurable />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="posts/:id" element={<PostDetail />} />
          <Route path="login" element={<Login />} />
          
          {/* Blog Management */}
          <Route
            path="dashboard"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="create-post"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <CreatePost />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="edit-post/:id"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <EditPost />
                </AdminRoute>
              </PrivateRoute>
            }
          />

          {/* Championship Management */}
          <Route path="championship" element={<ChampionshipDashboard />} />
          <Route path="standings/drivers" element={<DriverStandings />} />
          <Route path="standings/constructors" element={<ConstructorStandings />} />
          <Route path="circuits-map" element={<CircuitsMap />} />
          <Route path="circuits" element={<CircuitsMap />} />
          <Route path="legends" element={<Legends />} />
          <Route
            path="manage/drivers"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <ManageDrivers />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="manage/constructors"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <ManageConstructors />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="manage/races"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <ManageRaces />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="edit-race/:id"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <EditRace />
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="edit-race-results/:id"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <EditRaceResults />
                </AdminRoute>
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid rgba(225, 6, 0, 0.3)',
            },
          }}
        />
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
