import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft, Users, UserPlus, Calendar, TrendingUp, TrendingDown,
    UserCheck, Download, MapPin, Heart, Tag, Send,
    Lock, CheckCircle2, EyeOff, GraduationCap, Layers,
    BarChart2, FileText, ChevronDown, Info,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

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
        firstTimersCount: number;
        genderBreakdown: { MALE: number; FEMALE: number };
        regionBreakdown: Record<string, number>;
        salvationBreakdown?: Record<string, number>;
        tagDistribution?: Record<string, number>;
        yearOfStudyBreakdown?: Record<string, number>;
        collegeBreakdown?: Record<string, number>;
        courseBreakdown?: Record<string, number>;
        familyBreakdown?: Record<string, number>;
        teamBreakdown?: Record<string, number>;
        specialTagStats?: { finalists: number; alumni: number; volunteers: number };
        memberTypeBreakdown?: Record<string, number>;
    };
    guests: Array<{ name: string; purpose: string | null }>;
    attendees?: Array<{
        id: string;
        name: string;
        gender: 'MALE' | 'FEMALE';
        contactPhone?: string;
        region?: string;
        college?: string;
        course?: string;
        year?: number;
        families?: string[];
        teams?: string[];
        tags?: string[];
        isGuest: boolean;
        purpose?: string;
    }>;
    scope?: {
        type: 'all' | 'region' | 'family' | 'team';
        name: string;
        isFellowshipManager: boolean;
    };
}

interface ComparativeData {
    labels: string[];
    data: number[];
    comparison?: { difference: number; percentageChange: number };
}

interface ReportStatus {
    isPublished: boolean;
    publishedAt: string | null;
    publisher: { id: string; fullName: string } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GREEN = '#48A111';
const CHART_COLORS = ['#48A111', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
    if (!total) return '0%';
    return `${Math.round((part / total) * 100)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    accent = GREEN,
    onClick,
}: {
    icon: any;
    label: string;
    value: string | number;
    sub?: React.ReactNode;
    accent?: string;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}18` }}>
                    <Icon size={18} style={{ color: accent }} />
                </div>
                <span className="text-slate-500 text-sm font-medium">{label}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {sub && <div className="text-sm">{sub}</div>}
        </div>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon size={16} className="text-slate-400" />
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h2>
        </div>
    );
}

function Card({
    title, icon: Icon, badge, children, scrollable, onClick,
}: {
    title: string; icon?: any; badge?: string | number; children: React.ReactNode; scrollable?: boolean; onClick?: () => void;
}) {
    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''}`} onClick={onClick}>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 shrink-0">
                {Icon && <Icon size={14} className="text-slate-400" />}
                <p className="text-sm font-semibold text-slate-700 flex-1">{title}</p>
                {badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">{badge}</span>
                )}
            </div>
            <div className={scrollable ? 'overflow-y-auto max-h-64 p-5' : 'p-5'}>{children}</div>
        </div>
    );
}

function HorizontalBarList({ data, accent = GREEN, onItemClick }: { data: Array<[string, number]>; accent?: string; onItemClick?: (name: string) => void }) {
    if (!data.length) return <p className="text-slate-400 text-sm py-4 text-center">No data</p>;
    const max = Math.max(...data.map(([, v]) => v));
    return (
        <div className="space-y-3">
            {data.map(([name, value]) => (
                <div key={name} onClick={() => onItemClick?.(name)} className={onItemClick ? 'cursor-pointer group' : ''}>
                    <div className="flex justify-between mb-1">
                        <span className={`text-xs text-slate-600 truncate flex-1 pr-3 ${onItemClick ? 'group-hover:text-slate-900 group-hover:font-medium' : ''}`} title={name}>{name}</span>
                        <span className="text-xs font-bold text-slate-800 shrink-0">{value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${onItemClick ? 'group-hover:brightness-110' : ''}`}
                            style={{ width: `${(value / max) * 100}%`, backgroundColor: accent }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
            {label && <p className="font-semibold text-slate-800 mb-1">{label}</p>}
            {payload.map((p: any) => (
                <p key={p.name} className="text-slate-600">{p.name}: <strong>{p.value}</strong></p>
            ))}
        </div>
    );
};

// ── Drilldown Components ─────────────────────────────────────────────────────

interface DrilldownState {
    title: string;
    filterFn: (attendee: any) => boolean;
}

function DrilldownTable({
    title,
    attendees,
    onClose,
}: {
    title: string;
    attendees: any[];
    onClose: () => void;
}) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        title="Back to Report"
                    >
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500">{attendees.length} people</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Gender</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Role/Type</th>
                                <th className="px-6 py-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {attendees.map((a: any) => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {a.name}
                                        {a.isGuest && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                                GUEST
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">{a.gender || '-'}</td>
                                    <td className="px-6 py-4">{a.contactPhone || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {a.tags?.map((t: string) => (
                                                <span key={t} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                                                    {t}
                                                </span>
                                            ))}
                                            {!a.tags?.length && !a.isGuest && <span className="text-slate-400 italic">Member</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {a.isGuest ? (
                                            <span className="text-slate-500">{a.purpose || 'No purpose recorded'}</span>
                                        ) : (
                                            <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                                                {a.region && <span><MapPin size={10} className="inline mr-1" />{a.region}</span>}
                                                {a.course && <span><GraduationCap size={10} className="inline mr-1" />{a.course} ({a.college}) - Yr {a.year}</span>}
                                                {a.families?.length > 0 && <span><Users size={10} className="inline mr-1" />{a.families.join(', ')}</span>}
                                                {a.teams?.length > 0 && <span><Layers size={10} className="inline mr-1" />{a.teams.join(', ')}</span>}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {attendees.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No attendees match this filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

const EventReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<EventReportData | null>(null);
    const [comparison, setComparison] = useState<ComparativeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [activeDrilldown, setActiveDrilldown] = useState<DrilldownState | null>(null);
    const exportRef = useRef<HTMLDivElement>(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isFellowshipManager = currentUser.role === 'FELLOWSHIP_MANAGER';

    useEffect(() => {
        fetchReport();
        if (isFellowshipManager) fetchReportStatus();
    }, [id]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node))
                setShowExportMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchReport = async () => {
        setError(null);
        try {
            const [reportRes, compareRes] = await Promise.all([
                api.get(`/reports/${id}`),
                api.get(`/reports/${id}/compare`),
            ]);
            setReport(reportRes.data);
            setComparison(compareRes.data);
        } catch (err: any) {
            if (err.response?.status === 403) setError(err.response.data.message || 'Report not yet available');
            else setError('Failed to load report');
        } finally { setLoading(false); }
    };

    const fetchReportStatus = async () => {
        try {
            const res = await api.get(`/reports/${id}/status`);
            setReportStatus(res.data);
        } catch { /* silent */ }
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            await api.post(`/reports/${id}/publish`);
            await fetchReportStatus();
            toast.success('Report dispatched to leaders!');
        } catch { toast.error('Failed to dispatch report'); }
        finally { setPublishing(false); }
    };

    const handleUnpublish = async () => {
        if (!confirm('Are you sure you want to revoke leader access to this report?')) return;
        setPublishing(true);
        try {
            await api.post(`/reports/${id}/unpublish`);
            await fetchReportStatus();
            toast.success('Report unpublished.');
        } catch { toast.error('Failed to unpublish report'); }
        finally { setPublishing(false); }
    };

    const handleExportCSV = () => {
        if (!report) return;
        const rows: Array<[string, string | number]> = [
            ['Event Name', report.event.name],
            ['Date', new Date(report.event.date).toLocaleDateString()],
            ['Total Attendance', report.stats.totalAttendance],
            ['Members', report.stats.memberCount],
            ['Guests', report.stats.guestCount],
            ['First Timers', report.stats.firstTimersCount],
            ['Male', report.stats.genderBreakdown.MALE],
            ['Female', report.stats.genderBreakdown.FEMALE],
        ];
        if (report.stats.regionBreakdown)
            Object.entries(report.stats.regionBreakdown).forEach(([r, c]) => rows.push([`Region: ${r}`, c]));
        if (report.stats.specialTagStats) {
            rows.push(['Finalists', report.stats.specialTagStats.finalists]);
            rows.push(['Alumni', report.stats.specialTagStats.alumni]);
            rows.push(['Volunteers', report.stats.specialTagStats.volunteers]);
        }
        if (report.guests.length) {
            rows.push(['', '']);
            rows.push(['Guest Name', 'Purpose']);
            report.guests.forEach(g => rows.push([g.name, g.purpose || '-']));
        }
        const csv = [['Category', 'Value'].join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const link = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
            download: `${report.event.name.replace(/\s+/g, '_')}_Report.csv`,
        });
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleExportBlob = async (format: 'pdf' | 'excel') => {
        if (!report) return;
        try {
            const res = await api.get(`/reports/${id}/export/${format}`, { responseType: 'blob' });
            const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const link = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(new Blob([res.data], { type: mime })),
                download: `${report.event.name.replace(/\s+/g, '_')}_Report.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
            });
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch { toast.error(`Failed to export ${format.toUpperCase()}`); }
    };

    // ── Loading / error states ────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-200 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-slate-300 border-t-green-600 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading report…</p>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-slate-200 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
                    <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                        <Lock size={24} className="text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">Report Not Available</h2>
                    <p className="text-slate-500 text-sm mb-6">{error || 'Report not found.'}</p>
                    <button
                        onClick={() => navigate('/events')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                        style={{ backgroundColor: GREEN }}
                    >
                        <ArrowLeft size={16} /> Back to Events
                    </button>
                </div>
            </div>
        );
    }

    // ── Derived data ──────────────────────────────────────────────────────────

    const { stats, guests, scope } = report;

    const genderData = [
        { name: 'Male', value: stats.genderBreakdown.MALE || 0 },
        { name: 'Female', value: stats.genderBreakdown.FEMALE || 0 },
    ];

    const compositionData = [
        { name: 'Members', value: stats.memberCount },
        { name: 'Guests', value: stats.guestCount },
        { name: 'First Timers', value: stats.firstTimersCount },
    ];

    const regionData = stats.regionBreakdown
        ? Object.entries(stats.regionBreakdown).sort((a, b) => b[1] - a[1])
        : [];

    const yearData = stats.yearOfStudyBreakdown
        ? Object.entries(stats.yearOfStudyBreakdown)
            .filter(([, v]) => v > 0)
            .sort((a, b) => {
                const ai = parseInt(a[0].replace(/\D/g, '')) || 99;
                const bi = parseInt(b[0].replace(/\D/g, '')) || 99;
                return ai - bi;
            })
        : [];

    const diff = comparison?.comparison?.difference ?? 0;
    const pctChange = comparison?.comparison ? Math.abs(comparison.comparison.percentageChange) : null;

    const formattedDate = new Date(report.event.date).toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const trendData = comparison && comparison.labels.length > 1
        ? comparison.labels.map((label, i) => ({ name: label, Attendance: comparison.data[i] }))
        : null;

    // Totals for salvation decisions
    const totalDecisions = stats.salvationBreakdown
        ? Object.values(stats.salvationBreakdown).reduce((a, b) => a + b, 0)
        : 0;

    return (
        <div className="min-h-screen bg-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* ── Scope Banner (non-FM leaders) ─────────────────────────── */}
                {scope && scope.type !== 'all' && !scope.isFellowshipManager && (
                    <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 text-sm">
                        <Info size={14} className="text-blue-500 shrink-0" />
                        <span>
                            Showing data scoped to your <strong>{scope.type}</strong>: <strong>{scope.name}</strong>. Only members within your {scope.type} are included.
                        </span>
                    </div>
                )}

                {/* ── Page Header ───────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
                    <button
                        onClick={() => navigate('/events')}
                        className="self-start flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <ArrowLeft size={16} /> Events
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">{report.event.name}</h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="flex items-center gap-1.5 text-slate-500 text-sm">
                                <Calendar size={13} />{formattedDate}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-sm text-slate-500 capitalize">{report.event.type.replace(/_/g, ' ')}</span>
                            <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                                style={{
                                    backgroundColor: report.event.status === 'COMPLETED' ? '#dcfce7' : '#fef9c3',
                                    color: report.event.status === 'COMPLETED' ? '#166534' : '#713f12',
                                }}
                            >
                                {report.event.status}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isFellowshipManager && (
                            <>
                                {reportStatus?.isPublished ? (
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium">
                                            <CheckCircle2 size={14} />
                                            Dispatched
                                            {reportStatus.publishedAt && (
                                                <span className="text-green-500 text-xs ml-1">
                                                    {new Date(reportStatus.publishedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            onClick={handleUnpublish}
                                            disabled={publishing}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
                                        >
                                            <EyeOff size={14} />
                                            {publishing ? 'Revoking…' : 'Revoke'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handlePublish}
                                        disabled={publishing}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                        style={{ backgroundColor: GREEN }}
                                        onMouseEnter={e => !publishing && (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                        onMouseLeave={e => !publishing && (e.currentTarget.style.backgroundColor = GREEN)}
                                    >
                                        <Send size={15} />
                                        {publishing ? 'Dispatching…' : 'Dispatch to Leaders'}
                                    </button>
                                )}
                            </>
                        )}

                        <div className="relative" ref={exportRef}>
                            <button
                                onClick={() => setShowExportMenu(v => !v)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium cursor-pointer shadow-sm"
                            >
                                <Download size={15} /> Export
                                <ChevronDown size={13} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                                    {[
                                        { label: 'Export as PDF', action: () => { handleExportBlob('pdf'); setShowExportMenu(false); } },
                                        { label: 'Export as Excel', action: () => { handleExportBlob('excel'); setShowExportMenu(false); } },
                                        { label: 'Export as CSV', action: () => { handleExportCSV(); setShowExportMenu(false); } },
                                    ].map(({ label, action }) => (
                                        <button key={label} onClick={action}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                        >
                                            <FileText size={14} className="text-slate-400" />{label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Key Metrics ───────────────────────────────────────────── */}
                {activeDrilldown ? (
                    <DrilldownTable
                        title={activeDrilldown.title}
                        attendees={(report.attendees || []).filter(activeDrilldown.filterFn)}
                        onClose={() => setActiveDrilldown(null)}
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard
                                icon={Users} label="Total Attendance" value={stats.totalAttendance} accent={GREEN}
                                onClick={() => setActiveDrilldown({ title: 'Total Attendance', filterFn: () => true })}
                                sub={pctChange != null ? (
                                    <span className={`flex items-center gap-1 font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {diff >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                        {pctChange}% vs last event
                                    </span>
                                ) : <span className="text-slate-400">All attendees</span>}
                            />
                            <StatCard
                                icon={UserCheck} label="Registered Members" value={stats.memberCount} accent="#3b82f6"
                                onClick={() => setActiveDrilldown({ title: 'Registered Members', filterFn: a => !a.isGuest })}
                                sub={<span className="text-slate-400">{pct(stats.memberCount, stats.totalAttendance)} of total</span>}
                            />
                            <StatCard
                                icon={UserCheck} label="First Timers" value={stats.firstTimersCount} accent="#f59e0b"
                                onClick={() => setActiveDrilldown({ title: 'First Timers', filterFn: a => a.tags?.includes('PENDING_FIRST_ATTENDANCE') })}
                                sub={<span className="text-slate-400">{pct(stats.firstTimersCount, stats.memberCount)} of members</span>}
                            />
                            <StatCard
                                icon={UserPlus} label="Guests" value={stats.guestCount} accent="#8b5cf6"
                                onClick={() => setActiveDrilldown({ title: 'Guests', filterFn: a => a.isGuest })}
                                sub={<span className="text-slate-400">{pct(stats.guestCount, stats.totalAttendance)} of total</span>}
                            />
                        </div>

                        {/* ── Member Demographics ───────────────────────────────────── */}
                        {stats.memberTypeBreakdown && Object.keys(stats.memberTypeBreakdown).length > 0 && (() => {
                            const typeColors: Record<string, string> = {
                                'Makerere Students': GREEN,
                                'Alumni': '#3b82f6',
                                'Non-Makerere / Other': '#f59e0b',
                            };
                            const typeEntries = (['Makerere Students', 'Alumni', 'Non-Makerere / Other'] as const)
                                .map(k => [k, stats.memberTypeBreakdown![k] ?? 0] as [string, number])
                                .filter(([, v]) => v > 0);
                            return (
                                <div className="mb-8">
                                    <SectionHeader icon={Users} title="Member Demographics" />
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                            {typeEntries.map(([label, count]) => (
                                                <div
                                                    key={label}
                                                    onClick={() => setActiveDrilldown({
                                                        title: label,
                                                        filterFn: a => {
                                                            if (label === 'Alumni') return a.tags?.includes('ALUMNI');
                                                            if (label === 'Makerere Students') return !a.tags?.includes('ALUMNI') && !!a.course;
                                                            return !a.tags?.includes('ALUMNI') && !a.course && !a.isGuest;
                                                        }
                                                    })}
                                                    className="py-4 sm:py-0 px-0 sm:px-6 first:pl-0 last:pr-0 flex flex-col gap-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-600 font-medium">{label}</span>
                                                        <span className="text-xs text-slate-400">{pct(count, stats.memberCount)}</span>
                                                    </div>
                                                    <p className="text-3xl font-bold" style={{ color: typeColors[label] ?? '#64748b' }}>{count}</p>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: pct(count, stats.memberCount),
                                                                backgroundColor: typeColors[label] ?? '#64748b',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── Special Groups ────────────────────────────────────────── */}
                        {stats.specialTagStats && (
                            <div className="mb-8">
                                <SectionHeader icon={Tag} title="Notable Attendees" />
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Finalists', value: stats.specialTagStats.finalists, accent: '#f59e0b', tag: 'FINALIST' },
                                        { label: 'Alumni', value: stats.specialTagStats.alumni, accent: '#3b82f6', tag: 'ALUMNI' },
                                        { label: 'Volunteers', value: stats.specialTagStats.volunteers, accent: GREEN, tag: 'CHECK_IN_VOLUNTEER' },
                                    ].map(({ label, value, accent, tag }) => (
                                        <div
                                            key={label}
                                            onClick={() => setActiveDrilldown({ title: label, filterFn: a => a.tags?.includes(tag) })}
                                            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                                        >
                                            <div>
                                                <p className="text-sm text-slate-500 mb-1">{label}</p>
                                                <p className="text-3xl font-bold text-slate-900">{value}</p>
                                            </div>
                                            <div className="p-3 rounded-full" style={{ backgroundColor: `${accent}15` }}>
                                                <Users size={20} style={{ color: accent }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Attendance Breakdown ──────────────────────────────────── */}
                        <div className="mb-8">
                            <SectionHeader icon={BarChart2} title="Attendance Breakdown" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {/* Gender split */}
                                <Card title="Gender Split" icon={Users}>
                                    <div className="space-y-4">
                                        {genderData.map((item, i) => (
                                            <div key={item.name} onClick={() => setActiveDrilldown({ title: `Gender: ${item.name}`, filterFn: a => a.gender === item.name.toUpperCase() })} className="cursor-pointer group">
                                                <div className="flex justify-between text-sm mb-1.5">
                                                    <span className="text-slate-600 font-medium group-hover:text-slate-900 group-hover:font-semibold">{item.name}</span>
                                                    <span className="font-bold text-slate-800">{item.value} <span className="font-normal text-slate-400 text-xs">({pct(item.value, stats.totalAttendance)})</span></span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all group-hover:brightness-110"
                                                        style={{
                                                            width: pct(item.value, stats.totalAttendance),
                                                            backgroundColor: CHART_COLORS[i],
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                                            <span>Total attendees recorded with gender</span>
                                            <span className="font-semibold text-slate-600">{stats.genderBreakdown.MALE + stats.genderBreakdown.FEMALE}</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Composition */}
                                <Card title="Composition" icon={BarChart2} onClick={() => setActiveDrilldown({ title: 'Composition', filterFn: () => true })}>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={compositionData} barSize={32}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                                                    {compositionData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Region */}
                                <Card title="By Region" icon={MapPin}>
                                    {regionData.length > 0 ? (
                                        <HorizontalBarList data={regionData} onItemClick={(region) => setActiveDrilldown({ title: `Region: ${region}`, filterFn: a => a.region === region })} />
                                    ) : (
                                        <p className="text-slate-400 text-sm text-center py-6">No region data</p>
                                    )}
                                </Card>
                            </div>
                        </div>

                        {/* ── Academic Statistics ───────────────────────────────────── */}
                        {(stats.yearOfStudyBreakdown || stats.collegeBreakdown || stats.courseBreakdown) && (() => {
                            const collegeEntries = stats.collegeBreakdown
                                ? Object.entries(stats.collegeBreakdown).sort((a, b) => b[1] - a[1])
                                : [];
                            const courseEntries = stats.courseBreakdown
                                ? Object.entries(stats.courseBreakdown).sort((a, b) => b[1] - a[1])
                                : [];
                            const courseTop = courseEntries.slice(0, 10);
                            const hasMore = courseEntries.length > 10;
                            return (
                                <div className="mb-8">
                                    <SectionHeader icon={GraduationCap} title="Academic Statistics" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        {/* Year of Study */}
                                        {yearData.length > 0 && (
                                            <Card title="Year of Study" icon={GraduationCap} onClick={() => setActiveDrilldown({ title: 'Year of Study', filterFn: () => true })}>
                                                <div className="h-44">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={yearData.map(([n, v]) => ({ name: n, value: v }))} barSize={28}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                                            <Bar dataKey="value" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Card>
                                        )}

                                        {/* College — scrollable, shows all colleges */}
                                        {collegeEntries.length > 0 && (
                                            <Card
                                                title="By College"
                                                icon={GraduationCap}
                                                badge={`${collegeEntries.length} college${collegeEntries.length !== 1 ? 's' : ''}`}
                                                scrollable
                                            >
                                                <HorizontalBarList data={collegeEntries} accent="#3b82f6" onItemClick={(college) => setActiveDrilldown({ title: `College: ${college}`, filterFn: a => a.college === college })} />
                                            </Card>
                                        )}

                                        {/* Courses — top 10, count note if trimmed */}
                                        {courseEntries.length > 0 && (
                                            <Card
                                                title="Top Courses"
                                                icon={GraduationCap}
                                                badge={hasMore ? `top 10 of ${courseEntries.length}` : `${courseEntries.length}`}
                                                scrollable
                                            >
                                                <HorizontalBarList data={courseTop} accent="#8b5cf6" onItemClick={(course) => setActiveDrilldown({ title: `Course: ${course}`, filterFn: a => a.course === course })} />
                                                {hasMore && (
                                                    <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 text-center">
                                                        Showing top 10 of {courseEntries.length} courses. Export report for full list.
                                                    </p>
                                                )}
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── Organisational Statistics ─────────────────────────────── */}
                        {(stats.familyBreakdown || stats.teamBreakdown) && (
                            <div className="mb-8">
                                <SectionHeader icon={Layers} title="Organisational Statistics" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {stats.familyBreakdown && Object.keys(stats.familyBreakdown).length > 0 && (
                                        <Card title="Family Participation" icon={Users}>
                                            <HorizontalBarList
                                                data={Object.entries(stats.familyBreakdown).sort((a, b) => b[1] - a[1])}
                                                accent={GREEN}
                                                onItemClick={(family) => setActiveDrilldown({ title: `Family: ${family}`, filterFn: a => family === 'No Family' ? !a.families?.length : a.families?.includes(family) })}
                                            />
                                        </Card>
                                    )}
                                    {stats.teamBreakdown && Object.keys(stats.teamBreakdown).length > 0 && (
                                        <Card title="Ministry Teams" icon={Layers}>
                                            <HorizontalBarList
                                                data={Object.entries(stats.teamBreakdown).sort((a, b) => b[1] - a[1])}
                                                accent="#14b8a6"
                                                onItemClick={(team) => setActiveDrilldown({ title: `Team: ${team}`, filterFn: a => team === 'No Team' ? !a.teams?.length : a.teams?.includes(team) })}
                                            />
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Spiritual Decisions & Tags ────────────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                            {/* Decisions */}
                            <Card title="Spiritual Decisions" icon={Heart}>
                                {stats.salvationBreakdown && Object.keys(stats.salvationBreakdown).length > 0 ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {Object.entries(stats.salvationBreakdown).map(([type, count]) => (
                                                <div
                                                    key={type}
                                                    onClick={() => setActiveDrilldown({ title: `Decisions: ${type.replace(/_/g, ' ')}`, filterFn: a => a.purpose === type })}
                                                    className="border border-slate-100 rounded-lg p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                                >
                                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1 leading-tight">
                                                        {type.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                                            <span>Total decisions recorded</span>
                                            <span className="font-bold text-slate-700">{totalDecisions}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-6">No decisions recorded for this event.</p>
                                )}
                            </Card>

                            {/* Tag Distribution */}
                            <Card title="Tag Distribution" icon={Tag}>
                                {stats.tagDistribution && Object.keys(stats.tagDistribution).length > 0 ? (
                                    <div className="max-h-64 overflow-y-auto -mx-5 -mb-5">
                                        <table className="w-full text-left text-sm">
                                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tag</th>
                                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Members</th>
                                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">%</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Object.entries(stats.tagDistribution)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .map(([tag, count]) => (
                                                        <tr
                                                            key={tag}
                                                            onClick={() => setActiveDrilldown({ title: `Tag: ${tag}`, filterFn: a => a.tags?.includes(tag) })}
                                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                                        >
                                                            <td className="px-5 py-3 text-slate-700 group-hover:text-slate-900 group-hover:font-medium">{tag.replace(/_/g, ' ')}</td>
                                                            <td className="px-5 py-3 text-slate-900 font-semibold text-right">{count}</td>
                                                            <td className="px-5 py-3 text-slate-400 text-right">{pct(count, stats.memberCount)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-6">No tags recorded.</p>
                                )}
                            </Card>
                        </div>

                        {/* ── Attendance Trend ──────────────────────────────────────── */}
                        {trendData && (
                            <div className="mb-8">
                                <SectionHeader icon={TrendingUp} title="Attendance Trend" />
                                <Card title={`Last ${trendData.length} events of this type`} icon={TrendingUp}>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={trendData} barSize={36}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                                <Bar dataKey="Attendance" fill={GREEN} radius={[4, 4, 0, 0]}>
                                                    {trendData.map((_, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={i === trendData.length - 1 ? GREEN : '#cbd5e1'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {diff !== 0 && (
                                        <div className={`mt-3 text-sm flex items-center gap-1.5 ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <span>
                                                {diff > 0 ? '+' : ''}{diff} attendees ({pctChange}%) compared to the previous event of this type
                                            </span>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {/* ── Guest List ────────────────────────────────────────────── */}
                        {guests.length > 0 && (
                            <div className="mb-8">
                                <SectionHeader icon={UserPlus} title={`Guest List (${guests.length})`} />
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Purpose / Note</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {guests.map((guest, index) => (
                                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 text-slate-400 text-xs">{index + 1}</td>
                                                        <td className="px-5 py-3 text-slate-800 font-medium">{guest.name}</td>
                                                        <td className="px-5 py-3 text-slate-500">{guest.purpose || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                    </>
                )}

            </div>
        </div>
    );
};

export default EventReport;
