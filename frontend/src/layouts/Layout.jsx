import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

// Pages that need full-screen treatment (no container padding)
const FULLSCREEN_ROUTES = ['/legends', '/', '/circuits-map', '/circuits'];

const Layout = () => {
  const { pathname } = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className={isFullscreen ? '' : 'container mx-auto px-4 py-8'}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
