import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

// Pages that need full-screen treatment (no container padding)
const FULLSCREEN_ROUTES = ['/legends', '/', '/circuits', '/circuits-map'];

const Layout = () => {
  const { pathname } = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <Navbar />
      <main className={`flex-1 ${isFullscreen ? '' : 'container mx-auto px-4 py-8'}`}>
        <Outlet />
      </main>
      <footer className="border-t border-white/5 py-6 mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} F1 CMS. Formula 1 content hub.</p>
          <div className="flex items-center gap-4">
            <span className="uppercase tracking-wider font-bold text-gray-600">Built for F1 fans</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
