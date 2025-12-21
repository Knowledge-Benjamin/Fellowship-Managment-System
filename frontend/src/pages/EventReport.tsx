import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Users, UserPlus, Calendar, TrendingUp, UserCheck, Download, MapPin, ChevronDown, Heart, Tag } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

interface EventReportData {
    event: {
        id: string;
        name: string;
        date: string;
        type: string;
        status: string;
    };
    stats: {
        totalAttendance: number;
        memberCount: number;
        guestCount: number;
        genderBreakdown: {
            MALE: number;
            FEMALE: number;
        };
        regionBreakdown: Record<string, number>;
        firstTimersCount: number;
        salvationBreakdown?: Record<string, number>;
        tagDistribution?: Record<string, number>;
    };
    guests: Array<{
        name: string;
        purpose: string | null;
    }>;
}

interface ComparativeData {
    currentEvent: {
        totalAttendance: number;
    };
    comparison: {
        previousEvent: {
            name: string;
            date: string;
            totalAttendance: number;
        };
        difference: number;
        percentageChange: number;
    } | null;
}

const EventReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<EventReportData | null>(null);
    const [comparison, setComparison] = useState<ComparativeData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, [id]);

    const fetchReport = async () => {
        try {
            const [reportRes, compareRes] = await Promise.all([
                api.get(`/reports/${id}`),
                api.get(`/reports/${id}/compare`),
            ]);
            setReport(reportRes.data);
            setComparison(compareRes.data);
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!report) return;

        const headers = ['Category', 'Value'];
        const rows = [
            ['Event Name', report.event.name],
            ['Date', new Date(report.event.date).toLocaleDateString()],
            ['Status', report.event.status],
            ['Total Attendance', report.stats.totalAttendance],
            ['Member Count', report.stats.memberCount],
            ['Guest Count', report.stats.guestCount],
            ['First Timers', report.stats.firstTimersCount],
            ['Male Attendees', report.stats.genderBreakdown.MALE],
            ['Female Attendees', report.stats.genderBreakdown.FEMALE],
        ];

        if (report.stats.regionBreakdown) {
            Object.entries(report.stats.regionBreakdown).forEach(([region, count]) => {
                rows.push([`Region: ${region}`, count]);
            });
        }

        if (report.guests.length > 0) {
            rows.push(['', '']);
            rows.push(['Guest Name', 'Purpose']);
            report.guests.forEach(g => {
                rows.push([g.name, g.purpose || '-']);
            });
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${report.event.name.replace(/\s+/g, '_')}_Report.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = async () => {
        if (!report) return;
        try {
            const response = await api.get(`/reports/${id}/export/pdf`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${report.event.name.replace(/\s+/g, '_')}_Report.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Failed to export PDF. Please try again.');
        }
    };

    const handleExportExcel = async () => {
        if (!report) return;
        try {
            const response = await api.get(`/reports/${id}/export/excel`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${report.event.name.replace(/\s+/g, '_')}_Report.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Failed to export Excel. Please try again.');
        }
    };

    const [showExportMenu, setShowExportMenu] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading report...</div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-xl">Report not found</div>
            </div>
        );
    }

    const genderData = [
        { name: 'Male', value: report.stats.genderBreakdown.MALE || 0 },
        { name: 'Female', value: report.stats.genderBreakdown.FEMALE || 0 },
    ];

    const attendanceData = [
        { name: 'Members', value: report.stats.memberCount },
        { name: 'Guests', value: report.stats.guestCount },
    ];

    const regionData = report.stats.regionBreakdown
        ? Object.entries(report.stats.regionBreakdown).map(([name, value]) => ({ name, value }))
        : [];

    // Premium color palette for dark theme
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];

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
                    <div>
                        <h1 className="text-3xl font-bold text-white">{report.event.name} Report</h1>
                        <p className="text-slate-400">
                            {new Date(report.event.date).toLocaleDateString()} • {report.event.status}
                        </p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="ml-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-all"
                        >
                            <Download size={20} />
                            Export
                            <ChevronDown size={16} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-10">
                                <button
                                    onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 rounded-t-lg transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    Export as PDF
                                </button>
                                <button
                                    onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    Export as Excel
                                </button>
                                <button
                                    onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 rounded-b-lg transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    Export as CSV
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                <Users size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">Total Attendance</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{report.stats.totalAttendance}</p>
                        {comparison?.comparison && (
                            <div className={`flex items-center gap-1 text-sm mt-2 ${comparison.comparison.difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <TrendingUp size={16} className={comparison.comparison.difference < 0 ? 'rotate-180' : ''} />
                                <span>{Math.abs(comparison.comparison.percentageChange)}% vs last event</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                                <UserCheck size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">First Timers</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{report.stats.firstTimersCount}</p>
                        <p className="text-slate-500 text-sm mt-2">New members attending</p>
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                <UserPlus size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">Guests</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{report.stats.guestCount}</p>
                        <p className="text-slate-500 text-sm mt-2">Visitors checked in</p>
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                <Calendar size={20} />
                            </div>
                            <span className="text-slate-400 font-medium">Event Status</span>
                        </div>
                        <p className="text-3xl font-bold text-white capitalize">{report.event.status}</p>
                        <p className="text-slate-500 text-sm mt-2">{report.event.type.replace('_', ' ')}</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-6">Gender Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genderData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {genderData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-6">Composition</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="name" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Bar dataKey="value" fill="#8884d8">
                                        {attendanceData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index + 2]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-6">Region Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={regionData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94a3b8" />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Bar dataKey="value" fill="#2dd4bf" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Spiritual Decisions & Tags */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Spiritual Decisions */}
                    <div className="bg-[#151d30] rounded-2xl border border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Spiritual Decisions</h3>
                            <div className="bg-pink-500/10 p-2 rounded-lg">
                                <Heart size={20} className="text-pink-400" />
                            </div>
                        </div>
                        <div className="p-6">
                            {report.stats.salvationBreakdown && Object.keys(report.stats.salvationBreakdown).length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(report.stats.salvationBreakdown).map(([type, count]) => (
                                        <div key={type} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <p className="text-slate-400 text-xs uppercase mb-1">{type.replace(/_/g, ' ')}</p>
                                            <p className="text-2xl font-bold text-white">{count}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-4">No decisions recorded.</p>
                            )}
                        </div>
                    </div>

                    {/* Tag Distribution */}
                    <div className="bg-[#151d30] rounded-2xl border border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Group / Tag Distribution</h3>
                            <div className="bg-purple-500/10 p-2 rounded-lg">
                                <Tag size={20} className="text-purple-400" />
                            </div>
                        </div>
                        <div className="p-0">
                            {report.stats.tagDistribution && Object.keys(report.stats.tagDistribution).length > 0 ? (
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900/50 text-slate-400 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 font-medium text-xs uppercase">Tag Name</th>
                                                <th className="px-6 py-3 font-medium text-xs uppercase text-right">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {Object.entries(report.stats.tagDistribution)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([tag, count]) => (
                                                    <tr key={tag} className="text-slate-300 hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-3 text-sm">{tag}</td>
                                                        <td className="px-6 py-3 text-sm text-right font-medium">{count}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-8">No tags recorded.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Guest List */}
                {report.guests.length > 0 && (
                    <div className="bg-[#151d30] rounded-2xl border border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white">Guest List</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/50 text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Name</th>
                                        <th className="px-6 py-4 font-medium">Purpose</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {report.guests.map((guest, index) => (
                                        <tr key={index} className="text-slate-300 hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">{guest.name}</td>
                                            <td className="px-6 py-4">{guest.purpose || '-'}</td>
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

export default EventReport;
