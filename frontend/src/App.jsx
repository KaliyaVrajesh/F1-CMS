import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
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
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

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
        <Routes>
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
            <Route path="circuits" element={<CircuitsMap />} />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
