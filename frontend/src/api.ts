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
        // Network errors are already handled by the NetworkStatusListener
        // which listens to browser online/offline events
        return Promise.reject(error);
    }
);

export default api;

