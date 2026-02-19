import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, UserCheck, Home, UserX, ChevronDown, ChevronUp, Mail, Phone, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import FamilyCard from '../../components/Leadership/FamilyCard';
import CreateFamilyModal from '../../components/Leadership/CreateFamilyModal';
import AssignFamilyHeadModal from '../../components/Leadership/AssignFamilyHeadModal';
import { useAuth } from '../../context/AuthContext';

interface FamilyMember {
    id: string;
    member: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string;
        fellowshipNumber: string;
    };
    joinedAt: string;
}

interface Family {
    id: string;
    name: string;
    region: { id: string; name: string };
    familyHead?: { id: string; fullName: string } | null;
    meetingDay?: string | null;
    meetingTime?: string | null;
    meetingVenue?: string | null;
    _count: { members: number };
}

type ViewMode = 'all' | 'with-heads' | 'no-heads' | 'members';

/* ─── Accordion row for members view ────────────────────────── */
const FamilyAccordionRow: React.FC<{ family: Family }> = ({ family }) => {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const toggle = async () => {
        if (!open && !loaded) {
            setLoading(true);
            try {
                const res = await api.get(`/families/${family.id}`);
                setMembers(res.data.members ?? []);
                setLoaded(true);
            } catch {
                toast.error('Failed to load members');
            } finally {
                setLoading(false);
            }
        }
        setOpen((v) => !v);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header row */}
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer text-left"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: '#e9f5e1' }}>
                        <Home size={16} style={{ color: '#48A111' }} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{family.name}</p>
                        <p className="text-slate-500 text-xs">{family.region.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-3">
                    {/* Family head badge */}
                    {family.familyHead ? (
                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>
                            <UserCheck size={12} />
                            {family.familyHead.fullName}
                        </div>
                    ) : (
                        <span className="hidden sm:block text-xs italic text-slate-400">No head</span>
                    )}
                    {/* Member count */}
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {family._count.members} members
                    </span>
                    {/* Chevron */}
                    <span style={{ color: '#48A111' }}>
                        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                </div>
            </button>

            {/* Members panel */}
            {open && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 size={20} className="animate-spin mr-2" style={{ color: '#48A111' }} />
                            <span className="text-slate-500 text-sm">Loading members...</span>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-sm">No members in this family</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {members.map((fm) => (
                                <div
                                    key={fm.id}
                                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                        style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}
                                    >
                                        {fm.member.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-slate-900 font-semibold text-sm truncate">{fm.member.fullName}</p>
                                            {family.familyHead?.id === fm.member.id && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>Head</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                                <Hash size={10} /> {fm.member.fellowshipNumber}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-slate-400 truncate">
                                                <Mail size={10} /> {fm.member.email}
                                            </span>
                                            {fm.member.phoneNumber && (
                                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Phone size={10} /> {fm.member.phoneNumber}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── Stat card ──────────────────────────────────────────────── */
interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
    accent?: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, active, onClick, accent = '#48A111' }) => (
    <button
        onClick={onClick}
        className={`bg-white rounded-2xl border-2 shadow-xl p-5 flex items-center justify-between w-full text-left transition-all hover:scale-[1.02] cursor-pointer ${active ? 'border-[#48A111] shadow-[0_0_0_3px_rgba(72,161,17,0.15)]' : 'border-slate-200 hover:border-slate-300'
            }`}
    >
        <div>
            <p className="text-slate-500 text-sm mb-1">{label}</p>
            <p className="text-4xl font-bold text-slate-900">{value}</p>
        </div>
        <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: active ? accent + '22' : '#f1f5f9' }}
        >
            <span style={{ color: active ? accent : '#94a3b8' }}>{icon}</span>
        </div>
    </button>
);

/* ─── Main component ─────────────────────────────────────────── */
const FamiliesManagement = () => {
    const { user } = useAuth();
    const [families, setFamilies] = useState<Family[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
    const [showAssignHeadModal, setShowAssignHeadModal] = useState(false);
    const [view, setView] = useState<ViewMode>('all');

    const isFellowshipManager = user?.role === 'FELLOWSHIP_MANAGER';

    useEffect(() => { fetchFamilies(); }, []);

    const fetchFamilies = async () => {
        try {
            const response = await api.get('/families');
            setFamilies(response.data);
        } catch {
            toast.error('Failed to load families');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFamily = async (familyId: string) => {
        const family = families.find(f => f.id === familyId);
        if (!family) return;
        if (!confirm(`Delete "${family.name}"?\n\nThis will:\n- Remove all members\n- Deactivate family tags\n- Preserve history`)) return;
        try {
            await api.delete(`/families/${familyId}`);
            toast.success(`${family.name} deleted successfully`);
            fetchFamilies();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete family');
        }
    };

    const handleAssignHead = (family: Family) => {
        setSelectedFamily(family);
        setShowAssignHeadModal(true);
    };

    const handleStatClick = (newView: ViewMode) => {
        // Clicking the active card resets to 'all', clicking another card sets it
        setView((prev) => (prev === newView ? 'all' : newView));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin mr-3" style={{ color: '#48A111' }} size={36} />
                <span className="text-slate-500">Loading families...</span>
            </div>
        );
    }

    const totalMembers = families.reduce((sum, f) => sum + f._count.members, 0);
    const familiesWithHeads = families.filter(f => f.familyHead).length;
    const familiesWithoutHeads = families.filter(f => !f.familyHead).length;

    // Derive displayed list based on active view
    const displayedFamilies =
        view === 'with-heads' ? families.filter(f => f.familyHead)
            : view === 'no-heads' ? families.filter(f => !f.familyHead)
                : families;

    // View label for subheading
    const viewLabels: Record<ViewMode, string> = {
        all: 'All Families',
        'with-heads': 'Families with Heads',
        'no-heads': 'Families without Heads',
        members: 'Members by Family',
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            {/* Page header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl relative overflow-hidden" style={{ backgroundColor: '#e9f5e1' }}>
                        <div className="absolute inset-0 opacity-30 rounded-xl" style={{ backgroundColor: '#48A111' }} />
                        <Home className="w-6 h-6 relative z-10" style={{ color: '#48A111' }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-slate-900">Families</h1>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F2B50B' }} />
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">Manage small groups and discipleship families</p>
                    </div>
                </div>

                {isFellowshipManager && view !== 'members' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        style={{ backgroundColor: '#48A111' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                    >
                        <Plus size={18} />
                        Create Family
                    </button>
                )}
            </div>

            {/* Stat cards — 4 columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Total Families"
                    value={families.length}
                    icon={<Home size={22} />}
                    active={view === 'all'}
                    onClick={() => handleStatClick('all')}
                />
                <StatCard
                    label="Families with Heads"
                    value={familiesWithHeads}
                    icon={<UserCheck size={22} />}
                    active={view === 'with-heads'}
                    onClick={() => handleStatClick('with-heads')}
                />
                <StatCard
                    label="Without Heads"
                    value={familiesWithoutHeads}
                    icon={<UserX size={22} />}
                    active={view === 'no-heads'}
                    onClick={() => handleStatClick('no-heads')}
                    accent="#F2B50B"
                />
                <StatCard
                    label="Total Members"
                    value={totalMembers}
                    icon={<Users size={22} />}
                    active={view === 'members'}
                    onClick={() => handleStatClick('members')}
                />
            </div>

            {/* View label */}
            <div className="flex items-center gap-2 mb-5">
                <h2 className="text-lg font-bold text-slate-700">{viewLabels[view]}</h2>
                <span className="text-sm text-slate-400">
                    ({view === 'members' ? families.length : displayedFamilies.length})
                </span>
                {view !== 'all' && (
                    <button
                        onClick={() => setView('all')}
                        className="ml-auto text-xs text-slate-400 hover:text-slate-600 cursor-pointer underline"
                    >
                        Clear filter
                    </button>
                )}
            </div>

            {/* ── Members accordion view ── */}
            {view === 'members' ? (
                families.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-16 text-center text-slate-400">
                        No families yet
                    </div>
                ) : (
                    <div className="space-y-3">
                        {families.map((family) => (
                            <FamilyAccordionRow key={family.id} family={family} />
                        ))}
                    </div>
                )
            ) : (
                /* ── Card grid view ── */
                displayedFamilies.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-16 text-center">
                        <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: '#e9f5e1' }}>
                            <Home size={36} style={{ color: '#48A111' }} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {view === 'with-heads' ? 'No families have a head assigned' :
                                view === 'no-heads' ? 'All families have heads — great work!' :
                                    'No Families Yet'}
                        </h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            {view === 'all' ? 'Create your first family to get started' : ''}
                        </p>
                        {view === 'all' && isFellowshipManager && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 rounded-xl text-white font-semibold inline-flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                                style={{ backgroundColor: '#48A111' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                            >
                                <Plus size={18} />
                                Create Family
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {displayedFamilies.map((family) => (
                            <FamilyCard
                                key={family.id}
                                family={family}
                                onDelete={isFellowshipManager ? handleDeleteFamily : undefined}
                                onAssignHead={handleAssignHead}
                            />
                        ))}
                    </div>
                )
            )}

            {/* Modals */}
            {isFellowshipManager && (
                <CreateFamilyModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchFamilies}
                />
            )}

            {selectedFamily && (
                <AssignFamilyHeadModal
                    isOpen={showAssignHeadModal}
                    onClose={() => {
                        setShowAssignHeadModal(false);
                        setSelectedFamily(null);
                    }}
                    onSuccess={fetchFamilies}
                    family={selectedFamily}
                />
            )}
        </div>
    );
};

export default FamiliesManagement;
