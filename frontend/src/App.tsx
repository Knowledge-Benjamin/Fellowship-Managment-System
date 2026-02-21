import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import CourseManagement from './pages/CourseManagement';
import ResidenceManagement from './pages/ResidenceManagement';
import SalvationManagement from './pages/SalvationManagement';
import LeadershipOverview from './pages/Leadership/Overview';
import TeamsManagement from './pages/Leadership/Teams';
import TeamDetails from './pages/Leadership/TeamDetails';
import RegionalDashboard from './pages/Leadership/RegionalDashboard';
import Families from './pages/Leadership/Families';
import FamilyDetails from './pages/Leadership/FamilyDetails';
import FamilyHeadDashboard from './pages/Leadership/FamilyHeadDashboard';
import TeamLeaderDashboard from './pages/Leadership/TeamLeaderDashboard';
import LeaderReports from './pages/Leadership/LeaderReports';
import AcademicCalendar from './pages/AcademicCalendar';
import ProfileEditPage from './pages/Profile/ProfileEditPage';

// Roles that can view dispatched reports
const LEADER_ROLES = ['FELLOWSHIP_MANAGER', 'REGIONAL_HEAD', 'FAMILY_HEAD', 'TEAM_LEADER'] as const;
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CheckInPermissionGuard from './components/CheckInPermissionGuard';
import Navbar from './components/Navbar';
import { NetworkStatusListener } from './components/NetworkStatusListener';



function AppContent() {
  const location = useLocation();
  const isRegistrationPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-400 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-400 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <Navbar />

      {/* Main Content */}
      <main className={`relative pt-32 pb-12 min-h-screen ${isRegistrationPage ? '' : 'px-6'}`}>
        <div className={isRegistrationPage ? 'w-full' : 'max-w-7xl mx-auto'}>
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

            <Route path="/salvations" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <SalvationManagement />
              </ProtectedRoute>
            } />

            <Route path="/events/:id/report" element={
              <ProtectedRoute roles={[...LEADER_ROLES]}>
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
            <Route path="/courses" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <CourseManagement />
              </ProtectedRoute>
            } />
            <Route path="/residences" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <ResidenceManagement />
              </ProtectedRoute>
            } />

            <Route path="/leadership" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <LeadershipOverview />
              </ProtectedRoute>
            } />

            <Route path="/leadership/teams" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <TeamsManagement />
              </ProtectedRoute>
            } />

            <Route path="/leadership/teams/:id" element={
              <ProtectedRoute>
                <TeamDetails />
              </ProtectedRoute>
            } />

            <Route path="/leadership/my-region" element={
              <ProtectedRoute>
                <RegionalDashboard />
              </ProtectedRoute>
            } />

            <Route path="/leadership/families" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <Families />
              </ProtectedRoute>
            } />

            <Route path="/leadership/families/:id" element={
              <ProtectedRoute>
                <FamilyDetails />
              </ProtectedRoute>
            } />

            <Route path="/leadership/my-family" element={
              <ProtectedRoute>
                <FamilyHeadDashboard />
              </ProtectedRoute>
            } />

            <Route path="/leadership/my-team" element={
              <ProtectedRoute>
                <TeamLeaderDashboard />
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

            {/* FM-only direct profile edit (no approval workflow) */}
            <Route path="/profile/edit" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <ProfileEditPage />
              </ProtectedRoute>
            } />

            {/* Leader-only: dispatched reports list (not for regular Members) */}
            <Route path="/leader/reports" element={
              <ProtectedRoute roles={[...LEADER_ROLES]}>
                <LeaderReports />
              </ProtectedRoute>
            } />

            <Route path="/academic-calendar" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <AcademicCalendar />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-slate-200 pointer-events-none"></div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <NetworkStatusListener />
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
