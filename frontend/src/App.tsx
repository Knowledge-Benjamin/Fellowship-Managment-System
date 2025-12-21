import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import SalvationManagement from './pages/SalvationManagement';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CheckInPermissionGuard from './components/CheckInPermissionGuard';
import Navbar from './components/Navbar';



function AppContent() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500 opacity-5 rounded-full blur-3xl"></div>
      </div>

      <Navbar />

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

            <Route path="/salvations" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <SalvationManagement />
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
            <Route path="/courses" element={
              <ProtectedRoute roles={['FELLOWSHIP_MANAGER']}>
                <CourseManagement />
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
