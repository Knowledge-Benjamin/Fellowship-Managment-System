import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Registration from './pages/Registration';
import CheckIn from './pages/CheckIn';
import TransportBooking from './pages/TransportBooking';
import { Home, QrCode, Bus } from 'lucide-react';

function NavLink({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon: any }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
        transition-all duration-300 ease-out
        ${isActive
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }
      `}
    >
      {isActive && (
        <span className="absolute inset-0 rounded-lg bg-indigo-600 opacity-20 blur-sm"></span>
      )}
      <Icon size={18} className="relative z-10" />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500 opacity-5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-[#151d30]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">F</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Fellowship Manager</h1>
                <p className="text-xs text-slate-500">Digital Registration System</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <NavLink to="/" icon={Home}>Register</NavLink>
              <NavLink to="/check-in" icon={QrCode}>Check-in</NavLink>
              <NavLink to="/transport" icon={Bus}>Transport</NavLink>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex gap-2 mt-4">
            <NavLink to="/" icon={Home}>Register</NavLink>
            <NavLink to="/check-in" icon={QrCode}>Check-in</NavLink>
            <NavLink to="/transport" icon={Bus}>Transport</NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative pt-32 pb-12 px-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Registration />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/transport" element={<TransportBooking />} />
          </Routes>
        </div>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent pointer-events-none"></div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
