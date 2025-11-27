import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, Filter, CheckCircle, XCircle, User, MapPin, Users, Loader2 } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

interface Member {
    id: string;
    fullName: string;
    fellowshipNumber: string;
    email: string;
    phoneNumber: string;
    gender: 'MALE' | 'FEMALE';
    region: {
        id: string;
        name: string;
    };
    isCheckedIn: boolean;
    checkInTime: string | null;
    checkInMethod: string | null;
}

interface Region {
    id: string;
    name: string;
}

const ManualCheckIn = () => {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();

    const [members, setMembers] = useState<Member[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventName, setEventName] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Check-in state
    const [checkingInMemberId, setCheckingInMemberId] = useState<string | null>(null);

    useEffect(() => {
        // Check if user is a manager
        if (user?.role !== 'FELLOWSHIP_MANAGER') {
            toast.error('Access denied. Only Fellowship Managers can access  this page.');
            navigate('/');
            return;
        }

        fetchRegions();
        fetchMembers();
    }, [user, eventId, selectedRegion, selectedGender, selectedStatus, searchTerm]);

    const fetchRegions = async () => {
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            console.error('Failed to fetch regions:', error);
        }
    };

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (selectedRegion) params.append('regionId', selectedRegion);
            if (selectedGender) params.append('gender', selectedGender);
            if (selectedStatus) params.append('status', selectedStatus);

            const response = await api.get(`/attendance/${eventId}/members?${params.toString()}`);
            setMembers(response.data.members);
            setEventName(response.data.eventName);
        } catch (error: any) {
            console.error('Failed to fetch members:', error);
            toast.error(error?.response?.data?.error || 'Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (memberId: string, fellowshipNumber: string) => {
        setCheckingInMemberId(memberId);

        try {
            await api.post('/attendance/check-in', {
                fellowshipNumber,
                method: 'MANUAL',
                eventId,
            });

            toast.success('Check-in successful!');

            // Update the member in the list
            setMembers(members.map(m =>
                m.id === memberId
                    ? { ...m, isCheckedIn: true, checkInTime: new Date().toISOString(), checkInMethod: 'MANUAL' }
                    : m
            ));
        } catch (error: any) {
            console.error('Check-in failed:', error);
            toast.error(error?.response?.data?.error || 'Check-in failed');
        } finally {
            setCheckingInMemberId(null);
        }
    };

    const stats = {
        total: members.length,
        checkedIn: members.filter(m => m.isCheckedIn).length,
        notCheckedIn: members.filter(m => !m.isCheckedIn).length,
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/events')}
                        className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white">Manual Check-in</h1>
                        <p className="text-slate-400">{eventName}</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                <Users size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">Total Members</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                                <CheckCircle size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">Checked In</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.checkedIn}</p>
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                                <XCircle size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">Not Checked In</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.notCheckedIn}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={20} className="text-teal-400" />
                        <h2 className="text-xl font-bold text-white">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <label className="block text-slate-400 text-sm mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Name, fellowship number, or email..."
                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Region Filter */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Region</label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">All Regions</option>
                                {regions.map((region) => (
                                    <option key={region.id} value={region.id}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Gender Filter */}
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Gender</label>
                            <select
                                value={selectedGender}
                                onChange={(e) => setSelectedGender(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="">All Genders</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                        </div>

                        {/* Status Filter - Full width on new row */}
                        <div className="md:col-span-4">
                            <label className="block text-slate-400 text-sm mb-2">Check-in Status</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedStatus('')}
                                    className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all ${selectedStatus === ''
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setSelectedStatus('checked-in')}
                                    className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all ${selectedStatus === 'checked-in'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    Checked In
                                </button>
                                <button
                                    onClick={() => setSelectedStatus('not-checked-in')}
                                    className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all ${selectedStatus === 'not-checked-in'
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    Not Checked In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members Table */}
                <div className="bg-[#151d30] rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="animate-spin text-teal-500" size={48} />
                            </div>
                        ) : members.length === 0 ? (
                            <div className="text-center py-16">
                                <Users className="mx-auto mb-4 text-slate-600" size={64} />
                                <p className="text-white text-xl mb-2">No members found</p>
                                <p className="text-slate-400">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-900/50 text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-medium">Fellowship #</th>
                                        <th className="px-6 py-4 text-left font-medium">Name</th>
                                        <th className="px-6 py-4 text-left font-medium">Region</th>
                                        <th className="px-6 py-4 text-left font-medium">Gender</th>
                                        <th className="px-6 py-4 text-left font-medium">Status</th>
                                        <th className="px-6 py-4 text-left font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {members.map((member) => (
                                        <tr key={member.id} className="text-slate-300 hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-semibold text-teal-400">
                                                {member.fellowshipNumber}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-white">{member.fullName}</p>
                                                    <p className="text-sm text-slate-500">{member.phoneNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-500" />
                                                    {member.region.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${member.gender === 'MALE'
                                                        ? 'bg-blue-500/20 text-blue-300'
                                                        : 'bg-pink-500/20 text-pink-300'
                                                    }`}>
                                                    {member.gender}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {member.isCheckedIn ? (
                                                    <div>
                                                        <div className="flex items-center gap-2 text-green-400 mb-1">
                                                            <CheckCircle size={16} />
                                                            <span className="font-semibold">Checked In</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(member.checkInTime!).toLocaleTimeString()} ({member.checkInMethod})
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-orange-400 flex items-center gap-2">
                                                        <XCircle size={16} />
                                                        Not Checked In
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {member.isCheckedIn ? (
                                                    <button
                                                        disabled
                                                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-600 cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Already Checked In
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCheckIn(member.id, member.fellowshipNumber)}
                                                        disabled={checkingInMemberId === member.id}
                                                        className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-all disabled:bg-slate-700 disabled:text-slate-500 flex items-center gap-2"
                                                    >
                                                        {checkingInMemberId === member.id ? (
                                                            <>
                                                                <Loader2 size={16} className="animate-spin" />
                                                                Checking In...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <User size={16} />
                                                                Check In
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualCheckIn;
