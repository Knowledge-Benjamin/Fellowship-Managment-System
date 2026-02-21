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
                    <h1 className="text-4xl font-bold text-white mb-2">Event Reports</h1>
                    <p className="text-gray-400">
                        Dispatched reports from the Fellowship Manager
                    </p>
                </div>

                {reports.length === 0 ? (
                    <div className="glass-card p-16 text-center">
                        <FileText className="text-gray-600 mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-white mb-2">No Reports Yet</h2>
                        <p className="text-gray-400">
                            No event reports have been dispatched to leaders yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reports.map((report) => (
                            <Link
                                key={report.id}
                                to={`/events/${report.eventId}/report`}
                                className="glass-card p-6 block hover:border-teal-500/50 transition-all group"
                            >
                                {/* Event name */}
                                <h3 className="text-lg font-bold text-white group-hover:text-teal-400 transition-colors mb-1">
                                    {report.event.name}
                                </h3>

                                {/* Tags */}
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                    <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 rounded border border-teal-500/30">
                                        {report.event.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                        Dispatched
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-2 text-sm text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-gray-500" />
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
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={14} className="text-gray-500" />
                                            <span>{report.event.venue}</span>
                                        </div>
                                    )}
                                    {report.publisher && (
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-gray-500" />
                                            <span>Dispatched by {report.publisher.fullName}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                                        <span>
                                            {new Date(report.publishedAt).toLocaleDateString('en-UG', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* View CTA */}
                                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Click to view full report</span>
                                    <Eye size={16} className="text-teal-400 group-hover:scale-110 transition-transform" />
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
