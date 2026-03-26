import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft, Users, Target, Activity, TrendingUp, UserCheck, Download, MapPin, 
    CheckCircle2, AlertCircle, FileSpreadsheet, ChevronDown, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ───────────────────────────────────────────────

interface CampaignReportData {
    campaign: {
        id: string;
        title: string;
        type: 'MOBILIZATION' | 'BRING_ONE';
        status: string;
        targetContactsPerMember: number;
        deadline: string;
    };
    stats: {
        totalTarget: number;
        membersSubmitted: number;
        contactsSubmitted: number;
        leadersSubmitted: number;
        averageContactsPerMember: number;
        statusBreakdown: { PENDING: number; CONFIRMED: number; NOT_CONFIRMED: number };
        regionBreakdown: Record<string, number>;
        successPercentage: number;
        duplicatePercentage: number;
        confirmationPercentage: number;
        pendingPercentage: number;
        notConfirmedPercentage: number;
    };
    drilldowns: {
        submitters: Array<{ memberId: string, name: string; region: string; isLeader: boolean; contactsCount: number }>;
        contacts: Array<{ id: string, contactName: string; phone: string; submittedBy: string; status: string; isDuplicate: boolean }>;
    };
}

// ── Helpers ──────────────────────────────────────────────

function pct(value: number) {
    return `${Math.round(value)}%`;
}

// ── Sub-components ────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent = '#48A111' }: any) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md hover:border-slate-300">
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

// ── Main Page ─────────────────────────────────────────────

export default function CampaignReport() {
    const { type, id } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<CampaignReportData | null>(null);

    // Pagination States
    const [submitterPage, setSubmitterPage] = useState(1);
    const [contactPage, setContactPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchReport();
    }, [id, type]);

    const fetchReport = async () => {
        try {
            const endpoint = type === 'bring1' 
                ? `/bring-one/campaigns/${id}/report` 
                : `/campaigns/${id}/report`;
            
            const res = await api.get(endpoint);
            setReport(res.data);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to load campaign report.');
        } finally {
            setLoading(false);
        }
    };

    // ── Pagination Calculation ── //
    const paginatedSubmitters = report?.drilldowns.submitters.slice(
        (submitterPage - 1) * ITEMS_PER_PAGE, submitterPage * ITEMS_PER_PAGE
    ) || [];
    const totalSubmitterPages = Math.ceil((report?.drilldowns.submitters.length || 1) / ITEMS_PER_PAGE);

    const paginatedContacts = report?.drilldowns.contacts.slice(
        (contactPage - 1) * ITEMS_PER_PAGE, contactPage * ITEMS_PER_PAGE
    ) || [];
    const totalContactPages = Math.ceil((report?.drilldowns.contacts.length || 1) / ITEMS_PER_PAGE);

    // ── Export Logic ── //
    const exportToExcel = () => {
        if (!report) return;

        const wb = XLSX.utils.book_new();

        // 1. Overview Sheet
        const overviewData = [
            ['Metric', 'Value'],
            ['Campaign Name', report.campaign.title],
            ['Campaign Type', report.campaign.type],
            ['Status', report.campaign.status],
            ['Target per Member', report.campaign.targetContactsPerMember],
            ['Total Universe Target', report.stats.totalTarget],
            ['Members Who Submitted', report.stats.membersSubmitted],
            ['Leaders Who Submitted', report.stats.leadersSubmitted],
            ['Total Contacts Gathered', report.stats.contactsSubmitted],
            ['Success Progress', pct(report.stats.successPercentage)],
            ['Average Contacts / Member', report.stats.averageContactsPerMember],
            ['Confirmed Percentage', pct(report.stats.confirmationPercentage)],
            ['Pending Percentage', pct(report.stats.pendingPercentage)],
            ['Duplicate Percentage', pct(report.stats.duplicatePercentage)]
        ];
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        wsOverview['!cols'] = [{ wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

        // 2. Submitters Sheet
        const wsSubmitters = XLSX.utils.json_to_sheet(report.drilldowns.submitters.map(s => ({
            'Member Name': s.name,
            'Region': s.region,
            'Is Leader': s.isLeader ? 'Yes' : 'No',
            'Contacts Submitted': s.contactsCount
        })));
        wsSubmitters['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSubmitters, 'Submitters');

        // 3. Raw Contacts Sheet
        const wsContacts = XLSX.utils.json_to_sheet(report.drilldowns.contacts.map(c => ({
            'Contact/Pledge Name': c.contactName,
            'Phone/Email': c.phone,
            'Submitted By': c.submittedBy,
            'Call/Event Status': c.status,
            'Is Duplicate': c.isDuplicate ? 'Yes' : 'No'
        })));
        wsContacts['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsContacts, 'Raw Contacts');

        // Save
        const safeTitle = report.campaign.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        XLSX.writeFile(wb, `campaign_report_${safeTitle}.xlsx`);
    };

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#48A111] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="mx-auto text-slate-400 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-700">Report Not Found</h2>
                <button 
                    onClick={() => navigate('/campaign-management')} 
                    className="mt-4 text-[#48A111] font-semibold hover:underline"
                >
                    Back to Campaigns
                </button>
            </div>
        );
    }

    const { campaign, stats } = report;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/campaign-management')}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-3"
                    >
                        <ArrowLeft size={16} /> Back to Campaigns
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                            <Target size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {campaign.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    campaign.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    {campaign.status}
                                </span>
                                <span>{campaign.type.replace('_', ' ')}</span>
                                <span>Target: {stats.totalTarget} Total</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                        <Download size={18} /> Export Full Report
                    </button>
                </div>
            </div>

            {/* KPI Section 1: Overview */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-[#48A111]" /> Headline Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={TrendingUp} label="Total Mission Success"
                        value={pct(stats.successPercentage)} accent="#48A111"
                        sub={<span className="text-slate-500 text-xs">{stats.contactsSubmitted} of {stats.totalTarget} target reached</span>}
                    />
                    <StatCard
                        icon={Users} label="Participating Members"
                        value={stats.membersSubmitted} accent="#3b82f6"
                        sub={<span className="text-slate-500 text-xs">{stats.leadersSubmitted} are leaders</span>}
                    />
                    <StatCard
                        icon={Send} label="Total Contacts Gathered"
                        value={stats.contactsSubmitted} accent="#8b5cf6"
                        sub={<span className="text-slate-500 text-xs">Avg. {stats.averageContactsPerMember.toFixed(1)} per person</span>}
                    />
                    <StatCard
                        icon={CheckCircle2} label="Confirmed Success"
                        value={stats.statusBreakdown.CONFIRMED} accent="#f59e0b"
                        sub={<span className="text-slate-500 text-xs">{pct(stats.confirmationPercentage)} yield rate</span>}
                    />
                </div>
            </div>

            {/* KPI Section 2: Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 justify-between flex rounded-xl border border-slate-200">
                     <span className="text-slate-500 font-medium">Pending Processing</span>
                     <span className="text-xl font-bold text-slate-800">{stats.statusBreakdown.PENDING} <span className="text-sm font-normal text-slate-400">({pct(stats.pendingPercentage)})</span></span>
                </div>
                <div className="bg-white p-6 justify-between flex rounded-xl border border-slate-200">
                     <span className="text-slate-500 font-medium">Not Confirmed (Failed)</span>
                     <span className="text-xl font-bold text-slate-800">{stats.statusBreakdown.NOT_CONFIRMED} <span className="text-sm font-normal text-slate-400">({pct(stats.notConfirmedPercentage)})</span></span>
                </div>
                <div className="bg-white p-6 justify-between flex rounded-xl border border-slate-200">
                     <span className="text-slate-500 font-medium">Duplicate Entries</span>
                     <span className="text-xl font-bold text-slate-800 text-red-600">{pct(stats.duplicatePercentage)}</span>
                </div>
            </div>

            {/* Drilldown Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Submitters Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <UserCheck size={20} className="text-indigo-500"/> Participating Members
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Name</th>
                                    <th className="px-6 py-3 font-semibold">Region</th>
                                    <th className="px-6 py-3 font-semibold text-center">Contacts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedSubmitters.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-900 flex items-center gap-2">
                                            {s.name}
                                            {s.isLeader && <span className="w-2 h-2 rounded-full bg-blue-500" title="Leader" />}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">{s.region}</td>
                                        <td className="px-6 py-3 text-center font-bold text-indigo-600">{s.contactsCount}</td>
                                    </tr>
                                ))}
                                {paginatedSubmitters.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No submissions yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalSubmitterPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                            <button 
                                onClick={() => setSubmitterPage(p => Math.max(1, p - 1))}
                                disabled={submitterPage === 1}
                                className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                            >Prev</button>
                            <span className="text-xs font-bold text-slate-500">Page {submitterPage} of {totalSubmitterPages}</span>
                            <button 
                                onClick={() => setSubmitterPage(p => Math.min(totalSubmitterPages, p + 1))}
                                disabled={submitterPage === totalSubmitterPages}
                                className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                            >Next</button>
                        </div>
                    )}
                </div>

                {/* Contacts Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet size={20} className="text-green-600"/> Raw Contacts Pipeline
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Contact / Pledge</th>
                                    <th className="px-6 py-3 font-semibold">Submitted By</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedContacts.map((c, i) => (
                                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${c.isDuplicate ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {c.contactName}
                                            {c.isDuplicate && <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">DUP</span>}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">{c.submittedBy}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                                c.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                                c.status === 'NOT_CONFIRMED' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedContacts.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No contacts yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {totalContactPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                            <button 
                                onClick={() => setContactPage(p => Math.max(1, p - 1))}
                                disabled={contactPage === 1}
                                className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                            >Prev</button>
                            <span className="text-xs font-bold text-slate-500">Page {contactPage} of {totalContactPages}</span>
                            <button 
                                onClick={() => setContactPage(p => Math.min(totalContactPages, p + 1))}
                                disabled={contactPage === totalContactPages}
                                className="px-3 py-1 bg-white border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50"
                            >Next</button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
