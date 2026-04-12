import React, { useState } from 'react';
import { useSystemAdminAuth } from '../../context/SystemAdminAuthContext';
import systemApi from '../../systemApi';
import { Shield, Loader2, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SystemAdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useSystemAdminAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await systemApi.post('/system/auth/login', { email, password });
            login(data.token, { adminName: data.adminName });
            // The context handles navigation to dashboard
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to authenticate system admin');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-gray-900 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                    <Server className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    Control Plane Access
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    System Administrators Only
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100 dark:border-gray-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Admin Email
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => navigate('/login')}
                            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium transition-colors"
                        >
                            Return to Campus Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemAdminLogin;
