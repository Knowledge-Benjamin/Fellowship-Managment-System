import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SystemAdminAuthProvider } from './context/SystemAdminAuthContext';
import SystemAdminProtectedRoute from './components/SystemAdminProtectedRoute';
import SystemAdminLayout from './layouts/SystemAdminLayout';

const SystemAdminLogin = lazy(() => import('./pages/SystemAdmin/SystemAdminLogin'));
const CampusesOverview = lazy(() => import('./pages/SystemAdmin/CampusesOverview'));
const CampusDetails = lazy(() => import('./pages/SystemAdmin/CampusDetails'));

const Loader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Completely standalone System Admin app — own Router, own providers, own Routes.
 * Never shares any context or routing state with the campus app.
 */
const SystemAdminApp: React.FC = () => {
  return (
    <BrowserRouter>
      <SystemAdminAuthProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/system-admin/login" element={<SystemAdminLogin />} />
            <Route path="/system-admin" element={<SystemAdminProtectedRoute />}>
              <Route element={<SystemAdminLayout />}>
                <Route path="dashboard" element={<CampusesOverview />} />
                <Route path="campuses/:id" element={<CampusDetails />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </SystemAdminAuthProvider>
    </BrowserRouter>
  );
};

export default SystemAdminApp;
