import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import SystemAdminApp from './SystemAdminApp'

// Branch the entire React tree at the entry point.
// System-admin and campus app never share providers or Routes.
const isSystemAdmin = window.location.pathname.startsWith('/system-admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSystemAdmin ? <SystemAdminApp /> : <App />}
  </StrictMode>
);
