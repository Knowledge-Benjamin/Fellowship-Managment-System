import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Filter, Users, TrendingUp, UserCheck, PieChart as PieChartIcon, MapPin, Download, ChevronDown, Heart, Tag } from 'lucide-react';
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
        salvationBreakdown?: Record<string, number>;
        tagDistribution?: Record<string, number>;
        // Academic Statistics
        yearOfStudyBreakdown?: Record<string, number>;
        collegeBreakdown?: Record<string, number>;
        courseBreakdown?: Record<string, number>;
        // Organizational Statistics
        familyBreakdown?: Record<string, number>;
        teamBreakdown?: Record<string, number>;
        // Special Tags
        specialTagStats?: {
            finalists: number;
            alumni: number;
            volunteers: number;
        };
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

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start > today) {
            // Future date selected
            setData(null);
            setLoading(false);
            return;
        }

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
            setData(null);
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

    const handleExportPDF = async () => {
        if (!startDate || !endDate) return;
        try {
            const response = await api.get(`/reports/custom/export/pdf`, {
                params: {
                    startDate,
                    endDate,
                    ...(type && { type }),
                    ...(regionId && { regionId })
                },
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Custom_Report_${startDate}_to_${endDate}.pdf`;
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
        if (!startDate || !endDate) return;
        try {
            const response = await api.get(`/reports/custom/export/excel`, {
                params: {
                    startDate,
                    endDate,
                    ...(type && { type }),
                    ...(regionId && { regionId })
                },
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Custom_Report_${startDate}_to_${endDate}.xlsx`;
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

    // Helper function to check if date range is in the future
    const isFutureDateRange = () => {
        if (!startDate) return false;
        const start = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return start > today;
    };

    // Helper function to check if data is empty
    const isDataEmpty = () => {
        return data && (
            data.stats.totalEvents === 0 ||
            data.stats.totalAttendance === 0
        );
    };

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

                    {data && (
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
                                        className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 rounded-b-lg transition-colors flex items-center gap-2"
                                    >
                                        <Download size={16} />
                                        Export as Excel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
                ) : isFutureDateRange() ? (
                    <div className="text-center py-12 bg-[#151d30] rounded-2xl border border-slate-800">
                        <div className="mx-auto mb-4 w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Future Date Selected</h3>
                        <p className="text-slate-400 mb-4">The selected start date is in the future.</p>
                        <p className="text-slate-500 text-sm">Reports can only be generated for past dates. Please select a date range up to today.</p>
                    </div>
                ) : isDataEmpty() ? (
                    <div className="text-center py-12 bg-[#151d30] rounded-2xl border border-slate-800">
                        <div className="mx-auto mb-4 w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Events Found</h3>
                        <p className="text-slate-400 mb-4">No events occurred during the selected period.</p>
                        <div className="bg-slate-900/50 rounded-lg p-4 mt-4 text-left max-w-md mx-auto border border-slate-800">
                            <p className="text-slate-400 text-sm mb-2">Possible reasons:</p>
                            <ul className="text-slate-500 text-sm space-y-1 list-disc list-inside">
                                <li>No events held between {startDate} and {endDate}</li>
                                {type && <li>No {type.replace('_', ' ').toLowerCase()} events in this period</li>}
                                {regionId && <li>No events in the selected region</li>}
                            </ul>
                            <p className="text-slate-600 text-xs mt-3 pt-3 border-t border-slate-800">Try selecting a different date range or adjusting your filters.</p>
                        </div>
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

                        {/* Academic Statistics */}
                        {(data.stats.yearOfStudyBreakdown || data.stats.collegeBreakdown || data.stats.courseBreakdown) && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Academic Statistics</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Year of Study */}
                                    {data.stats.yearOfStudyBreakdown && Object.keys(data.stats.yearOfStudyBreakdown).length > 0 && (
                                        <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-xl font-bold text-white mb-6">Year of Study</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={Object.entries(data.stats.yearOfStudyBreakdown).map(([name, value]) => ({ name, value }))}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                        <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                                                        <YAxis stroke="#94a3b8" />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* College Distribution */}
                                    {data.stats.collegeBreakdown && Object.keys(data.stats.collegeBreakdown).length > 0 && (
                                        <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-xl font-bold text-white mb-6">Colleges</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={Object.entries(data.stats.collegeBreakdown).map(([name, value]) => ({ name, value }))}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {Object.keys(data.stats.collegeBreakdown).map((_entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'][index % 6]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Courses */}
                                    {data.stats.courseBreakdown && Object.keys(data.stats.courseBreakdown).length > 0 && (
                                        <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-xl font-bold text-white mb-6">Top Courses</h3>
                                            <div className="h-64 overflow-y-auto custom-scrollbar">
                                                <div className="space-y-3">
                                                    {Object.entries(data.stats.courseBreakdown)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .slice(0, 10)
                                                        .map(([name, value]) => (
                                                            <div key={name} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg">
                                                                <span className="text-slate-300 text-sm truncate flex-1">{name}</span>
                                                                <span className="text-white font-bold ml-2">{value}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Organizational Statistics */}
                        {(data.stats.familyBreakdown || data.stats.teamBreakdown || data.stats.specialTagStats) && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-white mb-6">Organizational Statistics</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Family Participation */}
                                    {data.stats.familyBreakdown && Object.keys(data.stats.familyBreakdown).length > 0 && (
                                        <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-xl font-bold text-white mb-6">Family Participation</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={Object.entries(data.stats.familyBreakdown).map(([name, value]) => ({ name, value }))} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                        <XAxis type="number" stroke="#94a3b8" />
                                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Team Participation */}
                                    {data.stats.teamBreakdown && Object.keys(data.stats.teamBreakdown).length > 0 && (
                                        <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-xl font-bold text-white mb-6">Ministry Teams</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={Object.entries(data.stats.teamBreakdown).map(([name, value]) => ({ name, value }))} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                        <XAxis type="number" stroke="#94a3b8" />
                                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Special Tags Stats */}
                                    {data.stats.specialTagStats && (
                                        <div className="bg-[#151d30] p-6 rounded-2xl border border-slate-800">
                                            <h3 className="text-xl font-bold text-white mb-6">Special Groups</h3>
                                            <div className="space-y-4">
                                                <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 p-4 rounded-xl border border-yellow-500/20">
                                                    <p className="text-yellow-400 text-sm uppercase mb-1">Finalists</p>
                                                    <p className="text-3xl font-bold text-white">{data.stats.specialTagStats.finalists}</p>
                                                </div>
                                                <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 p-4 rounded-xl border border-blue-500/20">
                                                    <p className="text-blue-400 text-sm uppercase mb-1">Alumni</p>
                                                    <p className="text-3xl font-bold text-white">{data.stats.specialTagStats.alumni}</p>
                                                </div>
                                                <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 p-4 rounded-xl border border-green-500/20">
                                                    <p className="text-green-400 text-sm uppercase mb-1">Volunteers</p>
                                                    <p className="text-3xl font-bold text-white">{data.stats.specialTagStats.volunteers}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Spiritual Decisions & Tags */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            {/* Spiritual Decisions */}
                            <div className="bg-[#151d30] rounded-2xl border border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white">Spiritual Decisions</h3>
                                    <div className="bg-pink-500/10 p-2 rounded-lg">
                                        <Heart size={20} className="text-pink-400" />
                                    </div>
                                </div>
                                <div className="p-6">
                                    {data.stats.salvationBreakdown && Object.keys(data.stats.salvationBreakdown).length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(data.stats.salvationBreakdown).map(([type, count]) => (
                                                <div key={type} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                                    <p className="text-slate-400 text-xs uppercase mb-1">{type.replace(/_/g, ' ')}</p>
                                                    <p className="text-2xl font-bold text-white">{count}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-center py-4">No decisions recorded in this period.</p>
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
                                    {data.stats.tagDistribution && Object.keys(data.stats.tagDistribution).length > 0 ? (
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-900/50 text-slate-400 sticky top-0">
                                                    <tr>
                                                        <th className="px-6 py-3 font-medium text-xs uppercase">Tag Name</th>
                                                        <th className="px-6 py-3 font-medium text-xs uppercase text-right">Count</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {Object.entries(data.stats.tagDistribution)
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
                                        <p className="text-slate-500 text-center py-8">No tags recorded in this period.</p>
                                    )}
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
