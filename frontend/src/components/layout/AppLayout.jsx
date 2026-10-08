import { useEffect, useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// Bootstrap "md" breakpoint: the sidebar is always visible from here up.
const DESKTOP_QUERY = '(min-width: 768px)';

const AppLayout = ({ title, children }) => {
  // Mobile navigation drawer (below the md breakpoint)
  const [showNav, setShowNav] = useState(false);
  const closeNav = () => setShowNav(false);

  // Close the drawer if the window grows to desktop width while it is open.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event) => event.matches && setShowNav(false);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: '#f8fafc' }}>
      {/* Left Sidebar (tablet and desktop) */}
      <div className="d-none d-md-flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Offcanvas
        show={showNav}
        onHide={closeNav}
        placement="start"
        id="mobile-navigation"
        aria-label="Main navigation"
        className="d-md-none border-0"
        style={{ width: '260px', backgroundColor: '#0f172a' }}
      >
        <Sidebar onNavigate={closeNav} onClose={closeNav} />
      </Offcanvas>

      {/* Main Area (Navbar + Screen Content) */}
      <div className="d-flex flex-column flex-grow-1 overflow-x-hidden" style={{ minWidth: 0 }}>
        <Navbar title={title} onMenuClick={() => setShowNav(true)} menuOpen={showNav} />
        <main className="flex-grow-1 p-3 p-md-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
