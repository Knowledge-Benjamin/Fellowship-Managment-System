import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Trash2, Loader, Calendar, Clock, MapPin, Edit2, Save, X } from 'lucide-react';
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

const FamilyDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [family, setFamily] = useState<FamilyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    // Schedule editing
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        meetingDay: '',
        meetingTime: '',
        meetingVenue: '',
    });

    const isFellowshipManager = user?.role === 'FELLOWSHIP_MANAGER';

    useEffect(() => {
        if (id) {
            fetchFamilyDetails();
        }
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
        if (!confirm(`Remove ${memberName} from ${family?.name}?\n\nThis will deactivate their family member tag.`)) {
            return;
        }

        try {
            await api.delete(`/families/${id}/members/${memberId}`);
            toast.success(`${memberName} removed from family`);
            fetchFamilyDetails();
        } catch (error: any) {
            console.error('Error removing member:', error);
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
            console.error('Error updating schedule:', error);
            toast.error(error.response?.data?.message || 'Failed to update schedule');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">Loading family details...</p>
                </div>
            </div>
        );
    }

    if (!family) {
        return null;
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/leadership/families"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Families
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">{family.name}</h1>
                        <p className="text-gray-400">{family.region.name} Region</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Info & Schedule */}
                <div className="space-y-6">
                    {/* Family Head */}
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Family Head</h2>
                        {family.familyHead ? (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                <p className="text-green-400 font-medium">{family.familyHead.fullName}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No family head assigned</p>
                        )}
                    </div>

                    {/* Meeting Schedule */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Meeting Schedule</h2>
                            {!editingSchedule ? (
                                <button
                                    onClick={() => setEditingSchedule(true)}
                                    className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveSchedule}
                                        className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                    >
                                        <Save size={18} />
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
                                        className="p-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {!editingSchedule ? (
                            <div className="space-y-3">
                                {family.meetingDay && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Calendar size={18} className="text-teal-400" />
                                        <span>{family.meetingDay}s</span>
                                    </div>
                                )}
                                {family.meetingTime && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Clock size={18} className="text-teal-400" />
                                        <span>{family.meetingTime}</span>
                                    </div>
                                )}
                                {family.meetingVenue && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <MapPin size={18} className="text-teal-400" />
                                        <span>{family.meetingVenue}</span>
                                    </div>
                                )}
                                {!family.meetingDay && !family.meetingTime && !family.meetingVenue && (
                                    <p className="text-gray-500 italic">No schedule set</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Day</label>
                                    <select
                                        value={scheduleForm.meetingDay}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingDay: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="">Select day...</option>
                                        {DAYS_OF_WEEK.map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Time</label>
                                    <input
                                        type="time"
                                        value={scheduleForm.meetingTime}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Venue</label>
                                    <input
                                        type="text"
                                        value={scheduleForm.meetingVenue}
                                        onChange={(e) => setScheduleForm({ ...scheduleForm, meetingVenue: e.target.value })}
                                        placeholder="e.g., Block A, Room 101"
                                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Members */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Users className="text-teal-400" size={24} />
                                <h2 className="text-2xl font-bold text-white">Members ({family.members.length})</h2>
                            </div>
                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all"
                            >
                                <UserPlus size={18} />
                                Add Member
                            </button>
                        </div>

                        {family.members.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="text-gray-600 mx-auto mb-4" size={48} />
                                <p className="text-gray-500 mb-4">No members in this family yet</p>
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                                >
                                    Add Your First Member
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {family.members.map((familyMember) => (
                                    <div
                                        key={familyMember.id}
                                        className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-white font-medium mb-1">
                                                    {familyMember.member.fullName}
                                                    {family.familyHead?.id === familyMember.member.id && (
                                                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                                                            Head
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                                                    <span>{familyMember.member.email}</span>
                                                    {familyMember.member.phoneNumber && (
                                                        <span>{familyMember.member.phoneNumber}</span>
                                                    )}
                                                    <span>#{familyMember.member.fellowshipNumber}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Joined {new Date(familyMember.joinedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMember(familyMember.member.id, familyMember.member.fullName)}
                                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                title="Remove from family"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
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
