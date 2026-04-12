import axios from 'axios';

const systemApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

systemApi.interceptors.request.use((config) => {
    // Only fetch the system_admin_token
    const token = localStorage.getItem('system_admin_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

systemApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('system_admin_token');
            localStorage.removeItem('system_admin_user');
            if (!window.location.pathname.includes('/system-admin/login')) {
                window.location.href = '/system-admin/login';
            }
        }
        return Promise.reject(error);
    }
);

export default systemApi;
