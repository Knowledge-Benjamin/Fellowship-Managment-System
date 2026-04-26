import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSystemAdminAuth } from '../context/SystemAdminAuthContext';
import { Server, LogOut, Shield } from 'lucide-react';

const SystemAdminLayout: React.FC = () => {
    const { adminUser, logout } = useSystemAdminAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-indigo-900 border-r border-indigo-800 text-white flex flex-col md:min-h-screen">
                <div className="p-6 border-b border-indigo-800 flex items-center space-x-3">
                    <Shield className="w-8 h-8 text-indigo-400" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Control Plane</h1>
                        <p className="text-xs text-indigo-300">System Administrator</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        to="/system-admin/dashboard"
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                            location.pathname === '/system-admin/dashboard'
                                ? 'bg-indigo-800 text-white'
                                : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                        }`}
                    >
                        <Server className="w-5 h-5" />
                        <span className="font-medium">Campuses</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-indigo-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center">
                                <span className="text-sm font-medium">{adminUser?.adminName.charAt(0) || 'S'}</span>
                            </div>
                            <div className="truncate w-32">
                                <p className="text-sm font-medium text-white truncate">{adminUser?.adminName}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-indigo-300 hover:text-white hover:bg-indigo-800 rounded-lg transition-colors"
                            title="Log Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default SystemAdminLayout;
