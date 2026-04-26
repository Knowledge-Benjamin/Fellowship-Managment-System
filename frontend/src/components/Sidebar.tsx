import React, { useState, useEffect } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTerminology } from '../context/TerminologyContext';
import { useCheckInAccess } from '../hooks/useCheckInAccess';
import {
    Home, QrCode, Bus, Calendar, UserPlus, PieChart, LogOut,
    User, MapPin, Tag, Users, BookOpen, Heart, Link2, Mail, Target,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api';
import logo from '../assets/logo.jpg';

interface SidebarLinkProps {
    to: string;
    icon: React.ElementType;
    label: string;
    isCollapsed: boolean;
    badgeCount?: number;
}

const SidebarLink = ({ to, icon: Icon, label, isCollapsed, badgeCount }: SidebarLinkProps) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <RouterNavLink
            to={to}
            className={`
                relative flex items-center py-2.5 px-3 mb-1 rounded-xl font-medium transition-all group
                ${isActive
                    ? 'bg-[#48A111] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
                ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}
            `}
            title={isCollapsed ? label : undefined}
        >
            <Icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#48A111]'}`} />

            {!isCollapsed && (
                <span className="flex-1 truncate">{label}</span>
            )}

            {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {badgeCount > 99 ? '99+' : badgeCount}
                </span>
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                    {label}
                </div>
            )}
        </RouterNavLink>
    );
};

export default function Sidebar() {
    const { logout, isManager, hasTag, hasTeamLeaderTag, hasTeamMemberTag, hasFamilyMemberTag } = useAuth();
    const { hasAccess: hasCheckInAccess } = useCheckInAccess();
    const { t } = useTerminology();

    // Load initial expanded state from local storage or default to large
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });

    const [pendingCount, setPendingCount] = useState(0);

    // Poll pending member count
    useEffect(() => {
        if (!isManager) return;
        const fetchStats = () => api.get('/pending-members/stats').then(r => setPendingCount(r.data.pending ?? 0)).catch(() => { });
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [isManager]);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    // --- Permissions Logic ---
    const isRegionalHead = hasTag('REGIONAL_HEAD');
    const isFamilyHead = hasTag('FAMILY_HEAD') || hasFamilyMemberTag();
    const isTeamLeader = hasTeamLeaderTag() || hasTeamMemberTag();

    return (
        <aside
            className={`hidden md:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-300 z-40
            ${isCollapsed ? 'w-20' : 'w-72'}`}
        >
            {/* Header / Logo */}
            <div className={`flex items-center h-20 border-b border-slate-100 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img src={logo} alt="Manifest Logo" className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-slate-100" />
                    <span className="font-bold text-slate-800 truncate tracking-tight text-lg">{t.FellowshipManager}</span>
                    </div>
                )}
                {isCollapsed && (
                    <img src={logo} alt="Manifest Logo" className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-slate-100" />
                )}
            </div>

            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3.5 top-24 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:shadow-md rounded-full p-1.5 transition-all z-50 cursor-pointer"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Navigation Lists */}
            <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">

                {/* 1. Core / Personal */}
                <div className="mb-6">
                    {!isCollapsed && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Personal</h3>}
                    <SidebarLink to={isManager ? "/leadership" : "/profile"} icon={Home} label={isManager ? "Dashboard" : "My Dashboard"} isCollapsed={isCollapsed} />
                    <SidebarLink to="/profile" icon={User} label="My Profile" isCollapsed={isCollapsed} />
                    {hasCheckInAccess && <SidebarLink to="/check-in" icon={QrCode} label="Scan Check-in" isCollapsed={isCollapsed} />}
                    <SidebarLink to="/transport" icon={Bus} label="Transport Booking" isCollapsed={isCollapsed} />
                    <SidebarLink to="/campaigns" icon={Target} label="My Campaigns" isCollapsed={isCollapsed} />
                </div>

                {/* 2. My Leadership (If applicable) */}
                {(isRegionalHead || isFamilyHead || isTeamLeader) && (
                    <div className="mb-6">
                        {!isCollapsed && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">My Leadership</h3>}
                        {isRegionalHead && <SidebarLink to="/leadership/my-region" icon={MapPin} label={`My ${t.Region}`} isCollapsed={isCollapsed} />}
                        {isFamilyHead && <SidebarLink to="/leadership/my-family" icon={Users} label={`My ${t.FamilyGroup}`} isCollapsed={isCollapsed} />}
                        {isTeamLeader && <SidebarLink to="/leadership/my-team" icon={Users} label={`My ${t.MinistryTeam}`} isCollapsed={isCollapsed} />}
                    </div>
                )}

                {/* 3. Fellowship Manager Admin Tools */}
                {isManager && (
                    <>
                        <div className="mb-6">
                            {!isCollapsed && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">People & Groups</h3>}
                            <SidebarLink to="/members" icon={Users} label="Members Directory" isCollapsed={isCollapsed} />
                            <SidebarLink to="/internal-register" icon={UserPlus} label="Register Member" isCollapsed={isCollapsed} />
                            <SidebarLink to="/pending-members" icon={UserPlus} label="Pending Approvals" badgeCount={pendingCount} isCollapsed={isCollapsed} />
                            <SidebarLink to="/leadership/families" icon={Users} label={`${t.FamilyGroup}s`} isCollapsed={isCollapsed} />
                            <SidebarLink to="/residences" icon={Home} label="Residences" isCollapsed={isCollapsed} />
                        </div>

                        <div className="mb-6">
                            {!isCollapsed && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Outreach & Events</h3>}
                            <SidebarLink to="/events" icon={Calendar} label="Event Management" isCollapsed={isCollapsed} />
                            <SidebarLink to="/guest-check-in" icon={UserPlus} label="Guest Check-in" isCollapsed={isCollapsed} />
                            <SidebarLink to="/campaign-management" icon={Target} label="Campaign Admin" isCollapsed={isCollapsed} />
                            <SidebarLink to="/salvations" icon={Heart} label="Salvations" isCollapsed={isCollapsed} />
                        </div>

                        <div className="mb-6">
                            {!isCollapsed && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">System Admin</h3>}
                            <SidebarLink to="/academic-calendar" icon={Calendar} label="Academic Calendar" isCollapsed={isCollapsed} />
                            <SidebarLink to="/courses" icon={BookOpen} label="Courses" isCollapsed={isCollapsed} />
                            <SidebarLink to="/regions" icon={MapPin} label={`${t.Region}s`} isCollapsed={isCollapsed} />
                            <SidebarLink to="/tags" icon={Tag} label="System Tags" isCollapsed={isCollapsed} />
                            <SidebarLink to="/registration-tokens" icon={Link2} label="Reg Tokens" isCollapsed={isCollapsed} />
                            <SidebarLink to="/emails" icon={Mail} label="Email Delivery" isCollapsed={isCollapsed} />
                            <SidebarLink to="/reports/custom" icon={PieChart} label="Custom Reports" isCollapsed={isCollapsed} />
                        </div>
                    </>
                )}
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button
                    onClick={logout}
                    className={`w-full flex items-center p-2 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}`}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span className="font-bold">Logout</span>}
                </button>
            </div>

        </aside>
    );
}
