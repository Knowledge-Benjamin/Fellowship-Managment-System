import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Trash2, Edit, UserPlus } from 'lucide-react';

interface TeamCardProps {
    team: {
        id: string;
        name: string;
        description?: string | null;
        leader?: {
            id: string;
            fullName: string;
            email: string;
        } | null;
        _count: {
            members: number;
        };
    };
    onEdit?: (teamId: string) => void;
    onDelete?: (teamId: string) => void;
    onManageMembers?: (teamId: string) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onEdit, onDelete, onManageMembers }) => {
    return (
        <div className="glass-card hover:shadow-lg transition-shadow relative">
            <Link to={`/leadership/teams/${team.id}`} className="block p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1 hover:text-teal-400 transition-colors">{team.name}</h3>
                        {team.description && (
                            <p className="text-gray-400 text-sm">{team.description}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Team Leader */}
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Team Leader</p>
                        {team.leader ? (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                                    <Users size={16} className="text-teal-400" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">{team.leader.fullName}</p>
                                    <p className="text-gray-400 text-xs">{team.leader.email}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm italic">No leader assigned</p>
                        )}
                    </div>

                    {/* Member Count */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                        <span className="text-gray-400 text-sm">Members</span>
                        <span className="text-teal-400 font-bold text-lg">
                            {team._count.members}
                        </span>
                    </div>
                </div>
            </Link>

            {/* Action Buttons - Outside Link to prevent nested navigation */}
            {(onEdit || onDelete || onManageMembers) && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    {onManageMembers && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onManageMembers(team.id);
                            }}
                            className="p-2 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors"
                            title="Manage Members"
                        >
                            <UserPlus size={18} />
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEdit(team.id);
                            }}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            title="Edit Team"
                        >
                            <Edit size={18} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(team.id);
                            }}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Delete Team"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamCard;
