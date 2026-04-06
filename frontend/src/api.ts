import axios from 'axios';

/**
 * Resolve the campus subdomain from the current browser URL.
 * e.g.  tamu.fellowshipmanager.app  →  "tamu"
 *       localhost                   →  null  (local dev fallback)
 */
function resolveCampusSubdomain(): string | null {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    // Only treat it as a subdomain if there are at least 3 parts (sub.domain.tld)
    // Ignore "localhost", "127.0.0.1", and plain apex domains
    if (parts.length >= 3 && parts[0] !== 'www') {
        return parts[0];
    }
    return null;
}

const CAMPUS_SUBDOMAIN = resolveCampusSubdomain();

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// ── Request interceptor ──────────────────────────────────────────────────────
// Attaches: (1) JWT auth token, (2) X-Campus-Domain for tenant routing
api.interceptors.request.use((config) => {
    // Auth token
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Campus domain header — tells the backend which Neon DB to connect to
    if (CAMPUS_SUBDOMAIN) {
        config.headers['X-Campus-Domain'] = CAMPUS_SUBDOMAIN;
    }

    return config;
});

// Response interceptor to handle network errors
// Note: Toast notifications are handled in NetworkStatusListener via browser events
// This interceptor is here for future expansion (e.g., specific API error toasts)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the session was invalidated due to privilege elevation (e.g., assigned as a leader)
        if (error.response?.status === 401 && error.response?.data?.code === 'SESSION_ELEVATED_PRIVILEGES') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login with a specific query parameter
            window.location.href = '/login?reason=elevated';
        }

        // Network errors are already handled by the NetworkStatusListener
        // which listens to browser online/offline events
        return Promise.reject(error);
    }
);

export default api;

