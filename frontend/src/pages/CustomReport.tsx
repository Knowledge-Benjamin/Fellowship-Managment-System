import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Filter, Users, TrendingUp, UserCheck, PieChart as PieChartIcon, MapPin } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from 'recharts';

interface CustomReportData {
    stats: {
        totalEvents: number;
        totalAttendance: number;
        averageAttendance: number;
        uniqueMembers: number;
        genderBreakdown: {
            MALE: number;
            FEMALE: number;
        };
        regionBreakdown: Record<string, number>;
    };
    chartData: Array<{
        date: string;
        name: string;
        attendance: number;
    }>;
}

interface Region {
    id: string;
    name: string;
}

const CustomReport = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('');
    const [regionId, setRegionId] = useState('');
    const [regions, setRegions] = useState<Region[]>([]);
    const [data, setData] = useState<CustomReportData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRegions();
    }, []);

    const fetchRegions = async () => {
        try {
            const response = await api.get('/regions');
            setRegions(response.data);
        } catch (error) {
            console.error('Failed to fetch regions:', error);
        }
    };

    const fetchReport = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            const response = await api.get('/reports/custom', {
                params: {
                    startDate,
                    endDate,
                    type: type || undefined,
                    regionId: regionId || undefined
                },
            });
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch custom report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickFilter = (period: '30days' | '3months' | 'ytd') => {
        const end = new Date();
        const start = new Date();

        if (period === '30days') {
            start.setDate(end.getDate() - 30);
        } else if (period === '3months') {
            start.setMonth(end.getMonth() - 3);
        } else if (period === 'ytd') {
            start.setMonth(0, 1);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    // Trigger fetch when filters change
    useEffect(() => {
        if (startDate && endDate) {
            fetchReport();
        }
    }, [startDate, endDate, type, regionId]);

    // Prepare region data for chart
    const regionChartData = data?.stats.regionBreakdown
        ? Object.entries(data.stats.regionBreakdown).map(([name, value]) => ({ name, value }))
        : [];

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
                        <h1 className="text-3xl font-bold text-white">Custom Reports</h1>
                        <p className="text-slate-400">Generate insights across multiple events</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800 mb-8">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Event Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">All Types</option>
                                <option value="TUESDAY_FELLOWSHIP">Tuesday Fellowship</option>
                                <option value="THURSDAY_PHANEROO">Thursday Phaneroo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">Region</label>
                            <select
                                value={regionId}
                                onChange={(e) => setRegionId(e.target.value)}
                                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 min-w-[150px]"
                            >
                                <option value="">All Regions</option>
                                {regions.map((region) => (
                                    <option key={region.id} value={region.id}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 ml-auto">
                            <button
                                onClick={() => handleQuickFilter('30days')}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm"
                            >
                                Last 30 Days
                            </button>
                            <button
                                onClick={() => handleQuickFilter('3months')}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm"
                            >
                                Last 3 Months
                            </button>
                            <button
                                onClick={() => handleQuickFilter('ytd')}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-sm"
                            >
                                YTD
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400">Generating report...</p>
                    </div>
                ) : data ? (
                    <div className="animate-fade-in space-y-8">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                        <Users size={20} />
                                    </div>
                                    <span className="text-slate-400 font-medium">Total Attendance</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{data.stats.totalAttendance}</p>
                                <p className="text-slate-500 text-sm mt-2">Across {data.stats.totalEvents} events</p>
                            </div>

                            <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-slate-400 font-medium">Average Attendance</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{data.stats.averageAttendance}</p>
                                <p className="text-slate-500 text-sm mt-2">Per event</p>
                            </div>

                            <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                        <UserCheck size={20} />
                                    </div>
                                    <span className="text-slate-400 font-medium">Unique Members</span>
                                </div>
                                <p className="text-3xl font-bold text-white">{data.stats.uniqueMembers}</p>
                                <p className="text-slate-500 text-sm mt-2">Distinct individuals</p>
                            </div>

                            <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                        <PieChartIcon size={20} />
                                    </div>
                                    <span className="text-slate-400 font-medium">Gender Ratio</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                    <div>
                                        <p className="text-2xl font-bold text-white">{data.stats.genderBreakdown.MALE}</p>
                                        <p className="text-xs text-slate-500">Male</p>
                                    </div>
                                    <div className="h-8 w-px bg-slate-700"></div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{data.stats.genderBreakdown.FEMALE}</p>
                                        <p className="text-xs text-slate-500">Female</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-xl font-bold text-white mb-6">Attendance Trend</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="date" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                            <Line type="monotone" dataKey="attendance" stroke="#8884d8" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                <h3 className="text-xl font-bold text-white mb-6">Region Distribution</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={regionChartData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis type="number" stroke="#94a3b8" />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                            <Bar dataKey="value" fill="#2dd4bf" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-[#151d30] rounded-2xl border border-slate-800">
                        <Filter className="mx-auto mb-4 text-slate-600" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">No Report Generated</h3>
                        <p className="text-slate-400">Select a date range or use quick filters to generate a report</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomReport;
