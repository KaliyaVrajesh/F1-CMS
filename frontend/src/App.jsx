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
import LiveRace from './pages/LiveRace';
import LiquidHero from './pages/LiquidHero';
import LiquidHeroConfigurable from './pages/LiquidHeroConfigurable';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import LoadingScreen from './components/LoadingScreen';
import AerodynamicCursor from './components/AerodynamicCursor';

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
  const { progress: glbProgress, active, loaded, total } = useProgress();

  // Preload legend images on mount
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = LEGEND_IMAGES.length;

    if (totalImages === 0) {
      setImagesReady(true);
      return;
    }

    const checkComplete = () => {
      loadedCount++;
      setImageProgress(Math.floor((loadedCount / totalImages) * 100));
      if (loadedCount >= totalImages) {
        setImagesReady(true);
      }
    };

    LEGEND_IMAGES.forEach(src => {
      const img = new Image();
      img.onload = checkComplete;
      img.onerror = checkComplete;
      img.src = src;
    });
  }, []);

  const isHomeRoute = location.pathname === '/' || location.pathname === '';

  // Track 3D GLB model readiness: wait until all 3D assets are 100% loaded and parsed
  useEffect(() => {
    if (glbProgress >= 100 && !active && (total > 0 || !isHomeRoute)) {
      setGlbReady(true);
    } else if (!isHomeRoute && !active && total === 0) {
      // Non-3D routes can mark ready after a brief tick
      const t = setTimeout(() => setGlbReady(true), 600);
      return () => clearTimeout(t);
    }
  }, [glbProgress, active, total, isHomeRoute]);

  // Window load event ensuring DOM and layout are ready
  useEffect(() => {
    const MIN_DURATION = 1500;
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
      return () => window.removeEventListener('load', finish);
    }
  }, []);

  // Micro-ticker for smooth visual feedback while large 3D models download
  const [downloadTicker, setDownloadTicker] = useState(0);
  useEffect(() => {
    if (!glbReady && active) {
      const interval = setInterval(() => {
        setDownloadTicker(prev => (prev < 45 ? prev + 1.5 : prev));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [glbReady, active]);

  // Hide loading screen ONLY when ALL resources (3D cars, images, window) are fully loaded
  useEffect(() => {
    if (windowReady && glbReady && imagesReady) {
      setIsLoading(false);
    }
  }, [windowReady, glbReady, imagesReady]);

  // Accurate combined progress percentage that reflects true asset loading
  const baseGlbProgress = glbReady
    ? 100
    : total > 0
    ? Math.min(99, Math.round((loaded / total) * 100 + downloadTicker * (1 / total)))
    : (active ? downloadTicker : 100);

  const resourceProgress = (baseGlbProgress * 0.5) + (imageProgress * 0.3) + (windowReady ? 20 : 0);
  const loadPercent = !isLoading
    ? 100
    : Math.min(100, Math.round(resourceProgress));

  // Route changes after first load — no full loading screen
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
  }, [location.pathname]);

  return (
    <>
      <AerodynamicCursor />
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
          <Route path="live-race" element={<LiveRace />} />
          <Route path="live" element={<LiveRace />} />
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
