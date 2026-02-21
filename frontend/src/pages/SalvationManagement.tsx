import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Calendar,
    User,
    Phone,
    Mail,
    CheckCircle,
    Clock,
    XCircle,
    Heart,
    ChevronDown,
    Loader2
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/ToastProvider';
import EmptyState from '../components/EmptyState';

interface Salvation {
    id: string;
    decisionDate: string;
    decisionType: 'SALVATION' | 'RED EDICATION' | 'BAPTISM_INTEREST' | 'PRAYER_REQUEST';
    followUpStatus: 'PENDING' | 'FIRST_CONTACT_MADE' | 'ONGOING_DISCIPLESHIP' | 'BAPTIZED' | 'INTEGRATED' | 'LOST_CONTACT';
    member?: {
        fullName: string;
        phoneNumber: string;
        email: string;
    };
    guestName?: string;
    guestPhone?: string;
    guestEmail?: string;
    counselor?: {
        fullName: string;
    };
    event: {
        name: string;
        date: string;
    };
    notes?: string;
    baptismInterest: boolean;
}

const SalvationManagement = () => {
    const { showToast } = useToast();
    const [salvations, setSalvations] = useState<Salvation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    useEffect(() => {
        fetchSalvations();
    }, []);

    const fetchSalvations = async () => {
        try {
            const response = await api.get('/salvations');
            setSalvations(response.data);
        } catch (error) {
            console.error('Failed to fetch salvations:', error);
            showToast('error', 'Failed to fetch salvations');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await api.put(`/salvations/${id}`, { followUpStatus: newStatus });
            fetchSalvations();
            showToast('success', 'Status updated successfully');
        } catch (error) {
            console.error('Failed to update status:', error);
            showToast('error', 'Failed to update status');
        }
    };

    const filteredSalvations = salvations.filter(record => {
        const matchesSearch =
            (record.member?.fullName || record.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.member?.phoneNumber || record.guestPhone || '').includes(searchTerm);

        const matchesStatus = statusFilter === 'ALL' || record.followUpStatus === statusFilter;
        const matchesType = typeFilter === 'ALL' || record.decisionType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'FIRST_CONTACT_MADE': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'ONGOING_DISCIPLESHIP': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'BAPTIZED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'INTEGRATED': return 'bg-green-50 text-green-700 border-green-200';
            case 'LOST_CONTACT': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word =>
            word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Salvation & Follow-up
                        </h1>
                        <p className="text-slate-500 mt-1">Track spiritual decisions and discipleship progress</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1 md:flex-none min-w-[140px]">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Decisions</span>
                            <span className="block text-3xl font-bold text-[#48A111]">{salvations.length}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1 md:flex-none min-w-[140px]">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Follow-up</span>
                            <span className="block text-3xl font-bold text-orange-500">
                                {salvations.filter(s => s.followUpStatus === 'PENDING').length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-900 placeholder-slate-400 transition-all font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 flex-1 md:flex-none">
                            <Filter size={18} className="text-[#48A111] hidden sm:block" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-700 font-semibold transition-all cursor-pointer appearance-none"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="FIRST_CONTACT_MADE">First Contact Made</option>
                                <option value="ONGOING_DISCIPLESHIP">Ongoing Discipleship</option>
                                <option value="BAPTIZED">Baptized</option>
                                <option value="INTEGRATED">Integrated</option>
                                <option value="LOST_CONTACT">Lost Contact</option>
                            </select>
                        </div>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#48A111] focus:ring-2 focus:ring-[#48A111]/20 focus:outline-none text-slate-700 font-semibold transition-all cursor-pointer appearance-none flex-1 md:flex-none"
                        >
                            <option value="ALL">All Decision Types</option>
                            <option value="SALVATION">Salvation</option>
                            <option value="REDEDICATION">Rededication</option>
                            <option value="BAPTISM_INTEREST">Baptism Interest</option>
                            <option value="PRAYER_REQUEST">Prayer Request</option>
                        </select>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <Loader2 className="w-10 h-10 text-[#48A111] animate-spin" />
                    </div>
                ) : filteredSalvations.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex items-center justify-center">
                        <EmptyState
                            icon={Heart}
                            title={searchTerm ? "No records found" : "No salvation records yet"}
                            description={searchTerm ? "Try a different search term" : "Records will appear here as decisions are recorded"}
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Event</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Person</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Decision</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Counselor</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-48">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSalvations.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-900">
                                                    {new Date(record.decisionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium mt-0.5">{record.event.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="p-2.5 rounded-xl bg-[#48A111]/10 text-[#48A111] mr-3">
                                                        <User size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                            {record.member?.fullName || record.guestName}
                                                            {record.member && <span className="px-2 py-0.5 bg-[#48A111]/10 text-[#48A111] text-[10px] uppercase font-bold tracking-wider rounded-md border border-[#48A111]/20">Member</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                            {record.member?.phoneNumber || record.guestPhone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-slate-700 capitalize">
                                                    {record.decisionType.replace('_', ' ').toLowerCase()}
                                                </span>
                                                {record.baptismInterest && (
                                                    <div className="mt-1">
                                                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] uppercase font-bold tracking-wider rounded-md border border-blue-100">
                                                            Wants Baptism
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-sm ${getStatusColor(record.followUpStatus)}`}>
                                                    {formatStatus(record.followUpStatus)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                {record.counselor?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative group w-full">
                                                    <select
                                                        value={record.followUpStatus}
                                                        onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                                                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#48A111]/20 focus:border-[#48A111] cursor-pointer shadow-sm hover:shadow-md transition-all"
                                                    >
                                                        <option value="PENDING">Pending</option>
                                                        <option value="FIRST_CONTACT_MADE">First Contact</option>
                                                        <option value="ONGOING_DISCIPLESHIP">Discipled</option>
                                                        <option value="BAPTIZED">Baptized</option>
                                                        <option value="INTEGRATED">Integrated</option>
                                                        <option value="LOST_CONTACT">Lost Contact</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalvationManagement;
