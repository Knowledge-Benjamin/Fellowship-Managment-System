import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

