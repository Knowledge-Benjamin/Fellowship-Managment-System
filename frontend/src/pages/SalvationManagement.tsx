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
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">
                            Salvation & Follow-up
                        </h1>
                        <p className="text-slate-500 mt-2">Track spiritual decisions and discipleship progress</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="block text-sm text-slate-500">Total Decisions</span>
                            <span className="block text-2xl font-bold text-teal-600">{salvations.length}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="block text-sm text-slate-500">Pending Follow-up</span>
                            <span className="block text-2xl font-bold text-orange-500">
                                {salvations.filter(s => s.followUpStatus === 'PENDING').length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-none text-slate-900 placeholder-slate-400 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none text-slate-900 transition-colors cursor-pointer"
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
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none text-slate-900 transition-colors cursor-pointer"
                    >
                        <option value="ALL">All Decision Types</option>
                        <option value="SALVATION">Salvation</option>
                        <option value="REDEDICATION">Rededication</option>
                        <option value="BAPTISM_INTEREST">Baptism Interest</option>
                        <option value="PRAYER_REQUEST">Prayer Request</option>
                    </select>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : filteredSalvations.length === 0 ? (
                    <EmptyState
                        icon={Heart}
                        title={searchTerm ? "No records found" : "No salvation records yet"}
                        description={searchTerm ? "Try a different search term" : "Records will appear here as decisions are recorded"}
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Event</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Person</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Decision</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Counselor</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSalvations.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {new Date(record.decisionDate).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-500">{record.event.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="p-2 rounded-lg bg-teal-50 text-teal-600 mr-3">
                                                        <User size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {record.member?.fullName || record.guestName}
                                                            {record.member && <span className="ml-2 px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] rounded-full border border-teal-200">Member</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {record.member?.phoneNumber || record.guestPhone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">
                                                    {record.decisionType.replace('_', ' ')}
                                                </span>
                                                {record.baptismInterest && (
                                                    <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200">
                                                        Wants Baptism
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(record.followUpStatus)}`}>
                                                    {formatStatus(record.followUpStatus)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {record.counselor?.fullName || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative group">
                                                    <select
                                                        value={record.followUpStatus}
                                                        onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                                                        className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer hover:border-teal-500 transition-colors"
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
