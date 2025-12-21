import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCheckInAccess } from '../hooks/useCheckInAccess';
import {
    Home, QrCode, Bus, Calendar, UserPlus, PieChart, LogIn, LogOut,
    User, MapPin, Tag, Users, Menu, X, ChevronDown, BookOpen
} from 'lucide-react';

interface NavLinkProps {
    to: string;
    children: React.ReactNode;
    icon: any;
    onClick?: () => void;
    className?: string;
}

function NavLink({ to, children, icon: Icon, onClick, className = '' }: NavLinkProps) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                transition-all duration-300 ease-out
                ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
                ${className}
            `}
        >
            {isActive && (
                <span className="absolute inset-0 rounded-lg bg-indigo-600 opacity-20 blur-sm"></span>
            )}
            <Icon size={18} className="relative z-10" />
            <span className="relative z-10">{children}</span>
        </Link>
    );
}

export default function Navbar() {
    const { isAuthenticated, isManager, logout } = useAuth();
    const { hasAccess: hasCheckInAccess } = useCheckInAccess();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsManagementOpen(false);
    }, [location.pathname]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsManagementOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const managementLinks = [
        { to: '/events', label: 'Events', icon: Calendar },
        { to: '/members', label: 'Members', icon: Users },
        { to: '/courses', label: 'Courses', icon: BookOpen },
        { to: '/regions', label: 'Regions', icon: MapPin },
        { to: '/tags', label: 'Tags', icon: Tag },
        { to: '/guest-check-in', label: 'Guest Check-in', icon: UserPlus },
    ];

    const isManagementActive = managementLinks.some(link => location.pathname === link.to);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-[#151d30]/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                    <span className="text-xl font-bold text-white">F</span>
                                </div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">Fellowship Manager</h1>
                                <p className="text-xs text-slate-500">Digital Registration System</p>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-2">
                        {isAuthenticated ? (
                            <>
                                {isManager && <NavLink to="/" icon={Home}>Register</NavLink>}
                                {hasCheckInAccess && <NavLink to="/check-in" icon={QrCode}>Check-in</NavLink>}

                                {isManager && (
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setIsManagementOpen(!isManagementOpen)}
                                            className={`
                                                relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                                                transition-all duration-300 ease-out
                                                ${isManagementActive || isManagementOpen
                                                    ? 'bg-indigo-600/10 text-indigo-400'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                <PieChart size={18} />
                                                <span>Management</span>
                                                <ChevronDown size={14} className={`transition-transform duration-200 ${isManagementOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isManagementOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-[#1a233b] border border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-1">
                                                    {managementLinks.map((link) => (
                                                        <Link
                                                            key={link.to}
                                                            to={link.to}
                                                            className={`
                                                                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                                                ${location.pathname === link.to
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                                                }
                                                            `}
                                                        >
                                                            <link.icon size={16} />
                                                            {link.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isManager && <NavLink to="/reports/custom" icon={PieChart}>Reports</NavLink>}
                                <NavLink to="/transport" icon={Bus}>Transport</NavLink>
                                <NavLink to="/profile" icon={User}>Profile</NavLink>

                                <div className="w-px h-6 bg-slate-800 mx-2"></div>

                                <button
                                    onClick={logout}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <NavLink to="/login" icon={LogIn}>Login</NavLink>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="absolute inset-y-0 right-0 w-80 bg-[#151d30] border-l border-slate-800 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-white">Menu</h2>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {isAuthenticated ? (
                                <>
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Main</p>
                                        {isManager && <NavLink to="/" icon={Home}>Register</NavLink>}
                                        {hasCheckInAccess && <NavLink to="/check-in" icon={QrCode}>Check-in</NavLink>}
                                        <NavLink to="/transport" icon={Bus}>Transport</NavLink>
                                        <NavLink to="/profile" icon={User}>Profile</NavLink>
                                    </div>

                                    {isManager && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 pt-4 border-t border-slate-800">Management</p>
                                            {managementLinks.map(link => (
                                                <NavLink key={link.to} to={link.to} icon={link.icon}>{link.label}</NavLink>
                                            ))}
                                            <NavLink to="/reports/custom" icon={PieChart}>Reports</NavLink>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-slate-800 mt-auto">
                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <NavLink to="/login" icon={LogIn}>Login</NavLink>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
