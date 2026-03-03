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

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);

    // Stats
    const [checkInStats, setCheckInStats] = useState({ total: 0, checkedIn: 0, notCheckedIn: 0 });

    useEffect(() => {
        // Check if user is a manager
        if (user?.role !== 'FELLOWSHIP_MANAGER') {
            toast.error('Access denied. Only Fellowship Managers can access this page.');
            navigate('/');
            return;
        }
        fetchRegions();
    }, [user, eventId, navigate, toast]);

    useEffect(() => {
        if (user?.role !== 'FELLOWSHIP_MANAGER') return;

        const to = setTimeout(() => {
            fetchMembers(page, searchTerm);
        }, 300);
        return () => clearTimeout(to);
    }, [searchTerm, selectedRegion, selectedGender, selectedStatus, eventId, user, page]);

    const fetchRegions = async () => {
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            console.error('Failed to fetch regions:', error);
        }
    };

    const fetchMembers = async (currentPage = page, search = searchTerm) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (selectedRegion) params.append('regionId', selectedRegion);
            if (selectedGender) params.append('gender', selectedGender);
            if (selectedStatus) params.append('status', selectedStatus);
            params.append('page', currentPage.toString());
            params.append('limit', '50');

            const response = await api.get(`/attendance/${eventId}/members?${params.toString()}`);
            setMembers(response.data.data || []);
            setTotalPages(response.data.meta?.totalPages || 1);
            setTotalMembers(response.data.meta?.total || 0);
            setEventName(response.data.eventName || 'Event');
            if (response.data.stats) {
                setCheckInStats(response.data.stats);
            }
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

            setCheckInStats(prev => ({
                ...prev,
                checkedIn: prev.checkedIn + 1,
                notCheckedIn: Math.max(0, prev.notCheckedIn - 1)
            }));
        } catch (error: any) {
            console.error('Check-in failed:', error);
            toast.error(error?.response?.data?.error || 'Check-in failed');
        } finally {
            setCheckingInMemberId(null);
        }
    };

    const stats = checkInStats;

    return (
        <div className="min-h-screen bg-slate-50 p-6 animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/events')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">Manual Check-in</h1>
                        <p className="text-slate-500 mt-1">{eventName}</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                <Users size={22} />
                            </div>
                            <span className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Members</span>
                        </div>
                        <p className="text-4xl font-bold text-slate-900">{stats.total}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-xl bg-green-50 text-[#48A111]">
                                <CheckCircle size={22} />
                            </div>
                            <span className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Checked In</span>
                        </div>
                        <p className="text-4xl font-bold text-slate-900">{stats.checkedIn}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
                                <XCircle size={22} />
                            </div>
                            <span className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Not Checked In</span>
                        </div>
                        <p className="text-4xl font-bold text-slate-900">{stats.notCheckedIn}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Filter size={20} className="text-[#48A111]" />
                        <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <label className="block text-slate-600 text-sm font-medium mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Name, fellowship number, or email..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all"
                                />
                            </div>
                        </div>

                        {/* Region Filter */}
                        <div>
                            <label className="block text-slate-600 text-sm font-medium mb-2">Region</label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => {
                                    setSelectedRegion(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all appearance-none cursor-pointer"
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
                            <label className="block text-slate-600 text-sm font-medium mb-2">Gender</label>
                            <select
                                value={selectedGender}
                                onChange={(e) => {
                                    setSelectedGender(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] transition-all appearance-none cursor-pointer"
                            >
                                <option value="">All Genders</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                        </div>

                        {/* Status Filter - Full width on new row */}
                        <div className="md:col-span-4">
                            <label className="block text-slate-600 text-sm font-medium mb-2">Check-in Status</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedStatus('');
                                        setPage(1);
                                    }}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${selectedStatus === ''
                                        ? 'bg-slate-800 text-white'
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedStatus('checked-in');
                                        setPage(1);
                                    }}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${selectedStatus === 'checked-in'
                                        ? 'bg-[#48A111] text-white'
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    Checked In
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedStatus('not-checked-in');
                                        setPage(1);
                                    }}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${selectedStatus === 'not-checked-in'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    Not Checked In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-[#48A111]" size={40} />
                            </div>
                        ) : members.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50/50">
                                <Users className="mx-auto mb-4 text-slate-300" size={56} />
                                <p className="text-slate-900 font-semibold text-lg mb-1">No members found</p>
                                <p className="text-slate-500">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Fellowship #</th>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Region</th>
                                        <th className="px-6 py-4">Gender</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((member) => (
                                        <tr key={member.id} className="text-slate-600 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-medium text-[#48A111] bg-[#48A111]/10 px-2.5 py-1 rounded-md text-sm">
                                                    {member.fellowshipNumber}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-900">{member.fullName}</p>
                                                    <p className="text-sm text-slate-500 mt-0.5">{member.phoneNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    {member.region.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${member.gender === 'MALE'
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                    : 'bg-pink-50 text-pink-600 border border-pink-100'
                                                    }`}>
                                                    {member.gender}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {member.isCheckedIn ? (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 text-[#48A111] mb-1">
                                                            <CheckCircle size={16} />
                                                            <span className="font-bold text-sm">Checked In</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 font-medium">
                                                            {new Date(member.checkInTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {member.checkInMethod}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-orange-500 flex items-center gap-1.5 font-bold text-sm">
                                                        <XCircle size={16} />
                                                        Not Checked In
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {member.isCheckedIn ? (
                                                    <button
                                                        disabled
                                                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed flex items-center gap-2 font-medium shadow-sm border border-slate-200/50"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Done
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCheckIn(member.id, member.fellowshipNumber)}
                                                        disabled={checkingInMemberId === member.id}
                                                        className="px-4 py-2 rounded-xl bg-[#48A111] text-white hover:bg-[#3d8b0e] transition-all disabled:opacity-50 flex items-center gap-2 font-semibold shadow-sm hover:shadow-md"
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

                {/* Pagination Footer */}
                <div className="mt-4 px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
                    <div className="text-sm text-slate-500">
                        Showing <span className="font-semibold text-slate-700">{totalMembers > 0 ? (page - 1) * 50 + 1 : 0}</span> to <span className="font-semibold text-slate-700">{Math.min(page * 50, totalMembers)}</span> of <span className="font-semibold text-slate-700">{totalMembers}</span> members
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"
                        >
                            Previous
                        </button>
                        <div className="px-4 py-2 flex items-center justify-center text-sm font-semibold text-slate-700">
                            {page} / {totalPages}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualCheckIn;
