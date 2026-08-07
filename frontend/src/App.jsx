import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useState, useEffect, useRef } from 'react';
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

function AppContent() {
  const location  = useLocation();
  const [isLoading, setIsLoading] = useState(true); // true on first load
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Initial load: show cinematic loading screen, hide after window load + min duration
    const MIN_DURATION = 2800;
    const started = Date.now();

    const finish = () => {
      const elapsed  = Date.now() - started;
      const remaining = Math.max(0, MIN_DURATION - elapsed);
      setTimeout(() => setIsLoading(false), remaining);
    };

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
      const fallback = setTimeout(() => setIsLoading(false), 7000);
      return () => {
        window.removeEventListener('load', finish);
        clearTimeout(fallback);
      };
    }
  }, []);

  // Route changes after first load — no loading screen needed
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
  }, [location.pathname]);

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
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
