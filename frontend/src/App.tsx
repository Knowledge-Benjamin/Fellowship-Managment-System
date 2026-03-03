import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

const Registration = lazy(() => import('./pages/Registration'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const TransportBooking = lazy(() => import('./pages/TransportBooking'));
const EventManagement = lazy(() => import('./pages/EventManagement'));
const GuestCheckIn = lazy(() => import('./pages/GuestCheckIn'));
const EventReport = lazy(() => import('./pages/EventReport'));
const CustomReport = lazy(() => import('./pages/CustomReport'));
const RegionManagement = lazy(() => import('./pages/RegionManagement'));
const ManualCheckIn = lazy(() => import('./pages/ManualCheckIn'));
const TagManagement = lazy(() => import('./pages/TagManagement'));
const MemberManagement = lazy(() => import('./pages/MemberManagement'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const CourseManagement = lazy(() => import('./pages/CourseManagement'));
const ResidenceManagement = lazy(() => import('./pages/ResidenceManagement'));
const SalvationManagement = lazy(() => import('./pages/SalvationManagement'));
const LeadershipOverview = lazy(() => import('./pages/Leadership/Overview'));
const TeamsManagement = lazy(() => import('./pages/Leadership/Teams'));
const TeamDetails = lazy(() => import('./pages/Leadership/TeamDetails'));
const RegionalDashboard = lazy(() => import('./pages/Leadership/RegionalDashboard'));
const Families = lazy(() => import('./pages/Leadership/Families'));
const FamilyDetails = lazy(() => import('./pages/Leadership/FamilyDetails'));
const FamilyHeadDashboard = lazy(() => import('./pages/Leadership/FamilyHeadDashboard'));
const TeamLeaderDashboard = lazy(() => import('./pages/Leadership/TeamLeaderDashboard'));
const LeaderReports = lazy(() => import('./pages/Leadership/LeaderReports'));
const AcademicCalendar = lazy(() => import('./pages/AcademicCalendar'));
const ProfileEditPage = lazy(() => import('./pages/Profile/ProfileEditPage'));
const SelfRegistration = lazy(() => import('./pages/SelfRegistration'));
const RegistrationTokens = lazy(() => import('./pages/RegistrationTokens'));
const PendingMembers = lazy(() => import('./pages/PendingMembers'));
const EmailManagement = lazy(() => import('./pages/EmailManagement'));

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
  const isRegistrationPage = location.pathname === '/' || location.pathname === '/register';

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
          <Suspense fallback={<div className="flex justify-center items-center h-[50vh]"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Public self-registration (no auth required) */}
              <Route path="/register" element={<SelfRegistration />} />

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

              <Route path="/registration-tokens" element={
                <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                  <RegistrationTokens />
                </ProtectedRoute>
              } />

              <Route path="/pending-members" element={
                <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                  <PendingMembers />
                </ProtectedRoute>
              } />

              <Route path="/emails" element={
                <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                  <EmailManagement />
                </ProtectedRoute>
              } />

            </Routes>
          </Suspense>
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
