import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Users, UserPlus, Trash2, Loader2, Calendar,
    Clock, MapPin, Edit2, Save, X, UserCheck, UserX
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import AddFamilyMemberModal from '../../components/Leadership/AddFamilyMemberModal';
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

interface FamilyDetails {
    id: string;
    name: string;
    region: {
        id: string;
        name: string;
    };
    familyHead?: {
        id: string;
        fullName: string;
    } | null;
    meetingDay?: string | null;
    meetingTime?: string | null;
    meetingVenue?: string | null;
    members: FamilyMember[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm";
const inputFocus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = '#48A111';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(72,161,17,0.12)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
    },
};

const FamilyDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [family, setFamily] = useState<FamilyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    const [editingSchedule, setEditingSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        meetingDay: '',
        meetingTime: '',
        meetingVenue: '',
    });

    useEffect(() => {
        if (id) fetchFamilyDetails();
    }, [id]);

    const fetchFamilyDetails = async () => {
        try {
            const response = await api.get(`/families/${id}`);
            setFamily(response.data);
            setScheduleForm({
                meetingDay: response.data.meetingDay || '',
                meetingTime: response.data.meetingTime || '',
                meetingVenue: response.data.meetingVenue || '',
            });
        } catch (error) {
            console.error('Failed to fetch family:', error);
            toast.error('Failed to load family details');
            navigate('/leadership/families');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName} from ${family?.name}?\n\nThis will deactivate their family member tag.`)) return;
        try {
            await api.delete(`/families/${id}/members/${memberId}`);
            toast.success(`${memberName} removed from family`);
            fetchFamilyDetails();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleSaveSchedule = async () => {
        try {
            await api.put(`/families/${id}`, scheduleForm);
            toast.success('Meeting schedule updated');
            setEditingSchedule(false);
            fetchFamilyDetails();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update schedule');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto mb-4" style={{ color: '#48A111' }} size={40} />
                    <p className="text-slate-500">Loading family details...</p>
                </div>
            </div>
        );
    }

    if (!family) return null;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Back link */}
            <Link
                to="/leadership/families"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm font-medium"
            >
                <ArrowLeft size={16} />
                Back to Families
            </Link>

            {/* Page header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}>
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{family.name}</h1>
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                            <MapPin size={13} style={{ color: '#48A111' }} />
                            {family.region.name}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="space-y-5">
                    {/* Family Head card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
                        <h2 className="text-base font-bold text-slate-900 mb-3">Family Head</h2>
                        {family.familyHead ? (
                            <div
                                className="flex items-center gap-3 p-3 rounded-xl border"
                                style={{ backgroundColor: '#e9f5e1', borderColor: '#c5e3b0' }}
                            >
                                <UserCheck size={18} style={{ color: '#48A111' }} />
                                <span className="font-semibold text-slate-900 text-sm">{family.familyHead.fullName}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <UserX size={18} className="text-slate-400" />
                                <span className="text-slate-400 italic text-sm">No head assigned</span>
                            </div>
                        )}
                    </div>

                    {/* Meeting Schedule card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-bold text-slate-900">Meeting Schedule</h2>
                            {!editingSchedule ? (
                                <button
                                    onClick={() => setEditingSchedule(true)}
                                    className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    <Edit2 size={15} />
                                </button>
                            ) : (
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={handleSaveSchedule}
                                        className="p-1.5 rounded-xl cursor-pointer transition-all"
                                        style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}
                                    >
                                        <Save size={15} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingSchedule(false);
                                            setScheduleForm({
                                                meetingDay: family.meetingDay || '',
                                                meetingTime: family.meetingTime || '',
                                                meetingVenue: family.meetingVenue || '',
                                            });
                                        }}
                                        className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {!editingSchedule ? (
                            <div className="space-y-2.5">
                                {family.meetingDay && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                        <Calendar size={14} style={{ color: '#48A111' }} />
                                        <span>{family.meetingDay}s</span>
                                    </div>
                                )}
                                {family.meetingTime && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                        <Clock size={14} style={{ color: '#48A111' }} />
                                        <span>{family.meetingTime}</span>
                                    </div>
                                )}
                                {family.meetingVenue && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                        <MapPin size={14} style={{ color: '#48A111' }} />
                                        <span>{family.meetingVenue}</span>
                                    </div>
                                )}
                                {!family.meetingDay && !family.meetingTime && !family.meetingVenue && (
                                    <p className="text-slate-400 italic text-sm">No schedule set</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Day</label>
                                    <select
                                        value={scheduleForm.meetingDay}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingDay: e.target.value })}
                                        className={inputClass}
                                        {...inputFocus}
                                    >
                                        <option value="">Select day...</option>
                                        {DAYS_OF_WEEK.map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={scheduleForm.meetingTime}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingTime: e.target.value })}
                                        className={inputClass}
                                        {...inputFocus}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Venue</label>
                                    <input
                                        type="text"
                                        value={scheduleForm.meetingVenue}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingVenue: e.target.value })}
                                        placeholder="e.g., Block A, Room 101"
                                        className={inputClass}
                                        {...inputFocus}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column — Members */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Users size={20} style={{ color: '#48A111' }} />
                                <h2 className="text-xl font-bold text-slate-900">
                                    Members
                                    <span className="ml-2 text-base font-normal text-slate-400">({family.members.length})</span>
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
                                style={{ backgroundColor: '#48A111' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                            >
                                <UserPlus size={16} />
                                Add Member
                            </button>
                        </div>

                        {family.members.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#e9f5e1' }}>
                                    <Users size={28} style={{ color: '#48A111' }} />
                                </div>
                                <p className="text-slate-500 mb-4 text-sm">No members in this family yet</p>
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all hover:scale-[1.02]"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                                >
                                    Add Your First Member
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {family.members.map((familyMember) => (
                                    <div
                                        key={familyMember.id}
                                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-slate-900 font-semibold text-sm">
                                                        {familyMember.member.fullName}
                                                    </h3>
                                                    {family.familyHead?.id === familyMember.member.id && (
                                                        <span
                                                            className="text-xs px-2 py-0.5 rounded-full font-bold"
                                                            style={{ backgroundColor: '#e9f5e1', color: '#48A111' }}
                                                        >
                                                            Head
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1">
                                                    <span>{familyMember.member.email}</span>
                                                    {familyMember.member.phoneNumber && (
                                                        <span>{familyMember.member.phoneNumber}</span>
                                                    )}
                                                    <span>#{familyMember.member.fellowshipNumber}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Joined {new Date(familyMember.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMember(familyMember.member.id, familyMember.member.fullName)}
                                                className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                                                title="Remove from family"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddFamilyMemberModal
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                onSuccess={fetchFamilyDetails}
                family={family}
            />
        </div>
    );
};

export default FamilyDetailsPage;
