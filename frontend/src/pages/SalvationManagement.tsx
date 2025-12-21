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
    MoreVertical,
    ChevronDown
} from 'lucide-react';
import api from '../api';

interface Salvation {
    id: string;
    decisionDate: string;
    decisionType: 'SALVATION' | 'REDEDICATION' | 'BAPTISM_INTEREST' | 'PRAYER_REQUEST';
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
    const [salvations, setSalvations] = useState<Salvation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [selectedSalvation, setSelectedSalvation] = useState<Salvation | null>(null);

    useEffect(() => {
        fetchSalvations();
    }, []);

    const fetchSalvations = async () => {
        try {
            const response = await api.get('/salvations');
            setSalvations(response.data);
        } catch (error) {
            console.error('Failed to fetch salvations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await api.put(`/salvations/${id}`, { followUpStatus: newStatus });
            fetchSalvations(); // Refresh list
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status');
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
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'FIRST_CONTACT_MADE': return 'bg-blue-100 text-blue-800';
            case 'ONGOING_DISCIPLESHIP': return 'bg-purple-100 text-purple-800';
            case 'BAPTIZED': return 'bg-indigo-100 text-indigo-800';
            case 'INTEGRATED': return 'bg-green-100 text-green-800';
            case 'LOST_CONTACT': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word =>
            word.charAt(0) + word.slice(1).toLowerCase()
        ).join(' ');
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Salvation & Follow-up</h1>
                    <p className="text-gray-500 mt-1">Track spiritual decisions and discipleship progress</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                        <span className="block text-sm text-gray-500">Total Decisions</span>
                        <span className="block text-xl font-bold text-purple-600">{salvations.length}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                        <span className="block text-sm text-gray-500">Pending Follow-up</span>
                        <span className="block text-xl font-bold text-orange-500">
                            {salvations.filter(s => s.followUpStatus === 'PENDING').length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : filteredSalvations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-500">No records found matching your filters</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Event</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Person</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Decision</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Counselor</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredSalvations.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {new Date(record.decisionDate).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">{record.event.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="bg-purple-100 p-2 rounded-full mr-3">
                                                    <User size={16} className="text-purple-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.member?.fullName || record.guestName}
                                                        {record.member && <span className="ml-2 px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] rounded-full">Member</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {record.member?.phoneNumber || record.guestPhone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700">
                                                {record.decisionType.replace('_', ' ')}
                                            </span>
                                            {record.baptismInterest && (
                                                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-100">
                                                    Wants Baptism
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.followUpStatus)}`}>
                                                {formatStatus(record.followUpStatus)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {record.counselor?.fullName || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative group">
                                                <select
                                                    value={record.followUpStatus}
                                                    onChange={(e) => handleStatusUpdate(record.id, e.target.value)}
                                                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-1 pl-2 pr-8 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer hover:border-purple-300"
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="FIRST_CONTACT_MADE">First Contact</option>
                                                    <option value="ONGOING_DISCIPLESHIP">Discipled</option>
                                                    <option value="BAPTIZED">Baptized</option>
                                                    <option value="INTEGRATED">Integrated</option>
                                                    <option value="LOST_CONTACT">Lost Contact</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
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
    );
};

export default SalvationManagement;
