import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCheckInAccess } from '../hooks/useCheckInAccess';
import {
    Home, QrCode, Bus, Calendar, UserPlus, PieChart, LogIn, LogOut,
    User, MapPin, Tag, Users, Menu, X, ChevronDown, BookOpen, Heart
} from 'lucide-react';
import logo from '../assets/logo.jpg';
import { createPortal } from 'react-dom';

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
    const { isAuthenticated, isManager, logout, hasTag } = useAuth();
    const { hasAccess: hasCheckInAccess } = useCheckInAccess();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    const isRegionalHead = hasTag('REGIONAL_HEAD');

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
        { to: '/leadership', label: 'Leadership', icon: Users },
        { to: '/members', label: 'Members', icon: Users },
        { to: '/courses', label: 'Courses', icon: BookOpen },
        { to: '/residences', label: 'Residences', icon: Home },
        { to: '/regions', label: 'Regions', icon: MapPin },
        { to: '/tags', label: 'Tags', icon: Tag },
        { to: '/guest-check-in', label: 'Guest Check-in', icon: UserPlus },
        { to: '/salvations', label: 'Salvations', icon: Heart },
    ];

    const isManagementActive = managementLinks.some(link => location.pathname === link.to);

    // ... (inside Navbar component, replace return statement logic)

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-800 bg-[#151d30]/95 backdrop-blur-xl">
                {/* ... existing navbar content ... */}
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="relative">
                                    <img
                                        src={logo}
                                        alt="Fellowship Logo"
                                        className="w-11 h-11 rounded-lg shadow-lg group-hover:scale-105 transition-transform object-cover"
                                    />
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse border-2 border-[#151d30]"></div>
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
                                    {isRegionalHead && (
                                        <NavLink to="/leadership/my-region" icon={MapPin}>
                                            My Region
                                        </NavLink>
                                    )}

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
                            className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors relative z-[101]"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Portal */}
            {isMobileMenuOpen && createPortal(
                <div className="fixed inset-0 z-[9999] lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="absolute inset-y-0 right-0 w-[85vw] max-w-sm bg-[#151d30] border-l border-slate-800 shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">F</span>
                                Menu
                            </h2>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6">
                            {isAuthenticated ? (
                                <>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Main</p>
                                        {isManager && <NavLink to="/" icon={Home} className="w-full">Register</NavLink>}
                                        {hasCheckInAccess && <NavLink to="/check-in" icon={QrCode} className="w-full">Check-in</NavLink>}
                                        <NavLink to="/transport" icon={Bus} className="w-full">Transport</NavLink>
                                        <NavLink to="/profile" icon={User} className="w-full">Profile</NavLink>
                                    </div>

                                    {isManager && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 pt-4 border-t border-slate-800">Management</p>
                                            {managementLinks.map(link => (
                                                <NavLink key={link.to} to={link.to} icon={link.icon} className="w-full">{link.label}</NavLink>
                                            ))}
                                            <NavLink to="/reports/custom" icon={PieChart} className="w-full">Reports</NavLink>
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
                                <NavLink to="/login" icon={LogIn} className="w-full">Login</NavLink>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
