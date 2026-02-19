import React from 'react';
import { Users, UserCheck, Edit, Trash2, Calendar, MapPin, Clock, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FamilyCardProps {
    family: {
        id: string;
        name: string;
        region: {
            id: string;
            name: string;
        };
        familyHead?: {
            id: string;
            fullName: string;
        } | null;
        meetingDay?: string | null;
        meetingTime?: string | null;
        meetingVenue?: string | null;
        _count: {
            members: number;
        };
    };
    onEdit?: (familyId: string) => void;
    onDelete?: (familyId: string) => void;
    onAssignHead?: (family: any) => void;
}

const FamilyCard: React.FC<FamilyCardProps> = ({ family, onEdit, onDelete, onAssignHead }) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/leadership/families/${family.id}`);
    };

    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl hover:border-slate-300 hover:-translate-y-0.5 transition-all cursor-pointer group"
            onClick={handleCardClick}
        >
            {/* Top accent bar */}
            <div className="h-1 w-full transition-all" style={{ backgroundColor: family.familyHead ? '#48A111' : '#e2e8f0' }} />

            <div className="p-5">
                {/* Name & action buttons row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-[#48A111] transition-colors">
                            {family.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                            <MapPin size={13} style={{ color: '#48A111' }} />
                            <span>{family.region.name}</span>
                        </div>
                    </div>
                    {/* Action buttons — stop propagation so they don't trigger card nav */}
                    <div className="flex gap-1.5 shrink-0" onClick={stopProp}>
                        {onEdit && (
                            <button
                                onClick={() => onEdit(family.id)}
                                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Edit Family"
                            >
                                <Edit size={15} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(family.id)}
                                className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                                title="Delete Family"
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Family Head */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Family Head</p>
                    {family.familyHead ? (
                        <div
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
                            style={{ backgroundColor: '#e9f5e1', borderColor: '#c5e3b0' }}
                        >
                            <div className="flex items-center gap-2">
                                <UserCheck size={15} style={{ color: '#48A111' }} />
                                <span className="text-sm font-semibold text-slate-900">{family.familyHead.fullName}</span>
                            </div>
                            {onAssignHead && (
                                <button
                                    onClick={(e) => { stopProp(e); onAssignHead(family); }}
                                    className="text-xs px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer transition-all"
                                >
                                    Change
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2">
                                <UserX size={15} className="text-slate-400" />
                                <span className="text-sm italic text-slate-400">No head assigned</span>
                            </div>
                            {onAssignHead && (
                                <button
                                    onClick={(e) => { stopProp(e); onAssignHead(family); }}
                                    className="text-xs px-2.5 py-1 rounded-lg text-white font-semibold cursor-pointer transition-all"
                                    style={{ backgroundColor: '#48A111' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F2B50B')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#48A111')}
                                >
                                    Assign Head
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Meeting Schedule */}
                {(family.meetingDay || family.meetingTime || family.meetingVenue) && (
                    <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Schedule</p>
                        <div className="space-y-1 text-xs">
                            {family.meetingDay && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar size={12} style={{ color: '#48A111' }} />
                                    <span>{family.meetingDay}s</span>
                                </div>
                            )}
                            {family.meetingTime && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Clock size={12} style={{ color: '#48A111' }} />
                                    <span>{family.meetingTime}</span>
                                </div>
                            )}
                            {family.meetingVenue && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <MapPin size={12} style={{ color: '#48A111' }} />
                                    <span>{family.meetingVenue}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer: member count */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <Users size={15} style={{ color: '#48A111' }} />
                        <span className="text-slate-500 text-sm">
                            <span className="font-bold text-slate-900 text-base">{family._count.members}</span> members
                        </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-[#48A111] transition-colors font-medium">
                        View details →
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FamilyCard;
