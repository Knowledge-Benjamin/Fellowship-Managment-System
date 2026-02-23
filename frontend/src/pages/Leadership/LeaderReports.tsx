import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FileText, Calendar, Users, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PublishedReport {
    id: string;
    eventId: string;
    isPublished: boolean;
    publishedAt: string;
    event: {
        id: string;
        name: string;
        date: string;
        type: string;
        venue?: string;
    };
    publisher: {
        fullName: string;
    } | null;
}

const LeaderReports: React.FC = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState<PublishedReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPublishedReports();
    }, []);

    const fetchPublishedReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reports/published');
            setReports(response.data);
        } catch (error: any) {
            console.error('Failed to fetch reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner message="Loading reports…" />;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Event Reports</h1>
                    <p className="text-slate-500">
                        Dispatched reports from the Fellowship Manager
                    </p>
                </div>

                {reports.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e9f5e1] mb-4">
                            <FileText size={32} style={{ color: '#48A111' }} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Reports Yet</h2>
                        <p className="text-slate-500">
                            No event reports have been dispatched to leaders yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reports.map((report) => (
                            <Link
                                key={report.id}
                                to={`/events/${report.eventId}/report`}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 block hover:shadow-md hover:border-slate-300 transition-all group"
                            >
                                {/* Event name */}
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#48A111] transition-colors mb-2">
                                    {report.event.name}
                                </h3>

                                {/* Tags */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                    <span className="text-xs px-2.5 py-1 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 font-medium">
                                        {report.event.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs px-2.5 py-1 bg-[#e9f5e1] text-[#48A111] rounded-xl border border-[#48A111]/20 flex items-center gap-1.5 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#48A111] inline-block" />
                                        Dispatched
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-2.5 text-sm text-slate-500">
                                    <div className="flex items-center gap-2.5">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span>
                                            {new Date(report.event.date).toLocaleDateString('en-UG', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    {report.event.venue && (
                                        <div className="flex items-center gap-2.5">
                                            <AlertCircle size={14} className="text-slate-400" />
                                            <span>{report.event.venue}</span>
                                        </div>
                                    )}
                                    {report.publisher && (
                                        <div className="flex items-center gap-2.5">
                                            <Users size={14} className="text-slate-400" />
                                            <span>Dispatched by {report.publisher.fullName}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 text-slate-400 text-xs pt-1">
                                        <span>
                                            Dispatched on {new Date(report.publishedAt).toLocaleDateString('en-UG', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* View CTA */}
                                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400">Click to view full report</span>
                                    <Eye size={16} className="text-slate-400 group-hover:text-[#48A111] group-hover:scale-110 transition-all" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaderReports;
