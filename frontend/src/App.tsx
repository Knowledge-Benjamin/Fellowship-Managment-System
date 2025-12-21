import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Registration from './pages/Registration';
import CheckIn from './pages/CheckIn';
import TransportBooking from './pages/TransportBooking';
import EventManagement from './pages/EventManagement';
import GuestCheckIn from './pages/GuestCheckIn';
import EventReport from './pages/EventReport';
import CustomReport from './pages/CustomReport';
import RegionManagement from './pages/RegionManagement';
import ManualCheckIn from './pages/ManualCheckIn';
import TagManagement from './pages/TagManagement';
import MemberManagement from './pages/MemberManagement';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CheckInPermissionGuard from './components/CheckInPermissionGuard';
import { useCheckInAccess } from './hooks/useCheckInAccess';
import { Home, QrCode, Bus, Calendar, UserPlus, PieChart, LogIn, LogOut, User, MapPin, Tag, Users } from 'lucide-react';

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

function Navigation() {
  const { isAuthenticated, isManager, logout } = useAuth();
  const { hasAccess: hasCheckInAccess } = useCheckInAccess();

  return (
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
            {isAuthenticated && (
              <>
                {isManager && <NavLink to="/" icon={Home}>Register</NavLink>}
                {hasCheckInAccess && <NavLink to="/check-in" icon={QrCode}>Check-in</NavLink>}
                {isManager && <NavLink to="/guest-check-in" icon={UserPlus}>Guest</NavLink>}
                {isManager && (
                  <>
                    <div className="w-px h-6 bg-slate-700 mx-2"></div>
                    <NavLink to="/events" icon={Calendar}>Events</NavLink>
                    <NavLink to="/regions" icon={MapPin}>Regions</NavLink>
                    <NavLink to="/members" icon={Users}>Members</NavLink>
                    <NavLink to="/tags" icon={Tag}>Tags</NavLink>
                    <NavLink to="/reports/custom" icon={PieChart}>Reports</NavLink>
                  </>
                )}
                <NavLink to="/transport" icon={Bus}>Transport</NavLink>
                <NavLink to="/profile" icon={User}>Profile</NavLink>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            )}
            {!isAuthenticated && (
              <NavLink to="/login" icon={LogIn}>Login</NavLink>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex gap-2 mt-4 overflow-x-auto pb-2">
          {isAuthenticated && (
            <>
              {isManager && <NavLink to="/" icon={Home}>Register</NavLink>}
              {hasCheckInAccess && <NavLink to="/check-in" icon={QrCode}>Check-in</NavLink>}
              <NavLink to="/transport" icon={Bus}>Transport</NavLink>
              <NavLink to="/profile" icon={User}>Profile</NavLink>
            </>
          )}
          {!isAuthenticated && (
            <NavLink to="/login" icon={LogIn}>Login</NavLink>
          )}
        </div>
      </div>
    </nav>
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

      <Navigation />

      {/* Main Content */}
      <main className="relative pt-32 pb-12 px-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <Registration />
              </ProtectedRoute>
            } />

            <Route path="/check-in" element={
              <CheckInPermissionGuard>
                <CheckIn />
              </CheckInPermissionGuard>
            } />

            <Route path="/guest-check-in" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <GuestCheckIn />
              </ProtectedRoute>
            } />

            <Route path="/events" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <EventManagement />
              </ProtectedRoute>
            } />

            <Route path="/events/:id/report" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <EventReport />
              </ProtectedRoute>
            } />

            <Route path="/events/:id/manual-checkin" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <ManualCheckIn />
              </ProtectedRoute>
            } />

            <Route path="/regions" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <RegionManagement />
              </ProtectedRoute>
            } />

            <Route path="/tags" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <TagManagement />
              </ProtectedRoute>
            } />

            <Route path="/members" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <MemberManagement />
              </ProtectedRoute>
            } />

            <Route path="/reports/event" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <CustomReport />
              </ProtectedRoute>
            } />

            <Route path="/reports/custom" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <CustomReport />
              </ProtectedRoute>
            } />

            <Route path="/transport" element={
              <ProtectedRoute>
                <TransportBooking />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
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
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
