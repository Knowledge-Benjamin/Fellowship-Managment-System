import React from 'react';
import { Users, UserCheck, Edit, Trash2, Calendar, MapPin, Clock, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    return (
        <div className="glass-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{family.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin size={14} />
                        <span>{family.region.name} Region</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(family.id)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            title="Edit Family"
                        >
                            <Edit size={18} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(family.id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Delete Family"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Family Head */}
            <div className="mb-4">
                <p className="text-gray-400 text-xs mb-2">Family Head</p>
                {family.familyHead ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserCheck size={16} className="text-green-400" />
                            <span className="text-sm text-green-400 font-medium">{family.familyHead.fullName}</span>
                        </div>
                        {onAssignHead && (
                            <button
                                onClick={() => onAssignHead(family)}
                                className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                            >
                                Change
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-700/30 border border-gray-600 rounded px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500 italic">No head assigned</span>
                        {onAssignHead && (
                            <button
                                onClick={() => onAssignHead(family)}
                                className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                            >
                                Assign Head
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Meeting Schedule */}
            {(family.meetingDay || family.meetingTime || family.meetingVenue) && (
                <div className="mb-4 bg-teal-500/10 border border-teal-500/30 rounded px-3 py-2">
                    <p className="text-xs text-gray-400 mb-2">Meeting Schedule</p>
                    <div className="space-y-1 text-xs">
                        {family.meetingDay && (
                            <div className="flex items-center gap-2 text-teal-400">
                                <Calendar size={12} />
                                <span>{family.meetingDay}s</span>
                            </div>
                        )}
                        {family.meetingTime && (
                            <div className="flex items-center gap-2 text-teal-400">
                                <Clock size={12} />
                                <span>{family.meetingTime}</span>
                            </div>
                        )}
                        {family.meetingVenue && (
                            <div className="flex items-center gap-2 text-teal-400">
                                <MapPin size={12} />
                                <span>{family.meetingVenue}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Member Count */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                <span className="text-gray-400 text-sm">Members</span>
                <div className="flex items-center gap-3">
                    <span className="text-teal-400 font-bold text-2xl">{family._count.members}</span>
                    <Link
                        to={`/leadership/families/${family.id}`}
                        className="text-xs px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors flex items-center gap-1"
                    >
                        <Eye size={14} />
                        Details
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FamilyCard;
