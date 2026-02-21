import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Trash2, UserCheck, UserX, ChevronRight } from 'lucide-react';

interface TeamCardProps {
    team: {
        id: string;
        name: string;
        description?: string | null;
        leader?: { id: string; fullName: string; email: string } | null;
        _count: { members: number };
    };
    onEdit?: (teamId: string) => void;
    onDelete?: (teamId: string) => void;
    onManageMembers?: (teamId: string) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group">
            {/* Accent bar */}
            <div className="h-0.5 w-full" style={{ backgroundColor: team.leader ? '#48A111' : '#e2e8f0' }} />

            <Link to={`/leadership/teams/${team.id}`} className="block p-5">
                {/* Team name + description */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                <Shield size={17} className="text-purple-500" />
                            </div>
                            <h3 className="font-bold text-slate-900 group-hover:text-[#48A111] transition-colors truncate">
                                {team.name}
                            </h3>
                        </div>
                        {team.description && (
                            <p className="text-xs text-slate-500 ml-11 line-clamp-2">{team.description}</p>
                        )}
                    </div>
                </div>

                {/* Leader */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Team Leader</p>
                    {team.leader ? (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                            style={{ backgroundColor: '#e9f5e1', borderColor: '#c5e3b0' }}>
                            <UserCheck size={14} style={{ color: '#48A111' }} />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{team.leader.fullName}</p>
                                <p className="text-xs text-slate-500 truncate">{team.leader.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                            <UserX size={14} className="text-amber-400" />
                            <span className="text-xs italic text-amber-600">No leader assigned</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <Users size={15} style={{ color: '#48A111' }} />
                        <span className="text-slate-500 text-sm">
                            <span className="font-bold text-slate-900">{team._count.members}</span> members
                        </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-[#48A111] transition-colors font-medium flex items-center gap-1">
                        View <ChevronRight size={13} />
                    </span>
                </div>
            </Link>

            {/* Delete button — outside Link */}
            {onDelete && (
                <div className="px-5 pb-4 pt-0">
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(team.id); }}
                        className="w-full py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                        <Trash2 size={13} />
                        Delete Team
                    </button>
                </div>
            )}
        </div>
    );
};

export default TeamCard;
