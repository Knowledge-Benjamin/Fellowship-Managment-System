import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import FamilyCard from '../../components/Leadership/FamilyCard';
import CreateFamilyModal from '../../components/Leadership/CreateFamilyModal';
import AssignFamilyHeadModal from '../../components/Leadership/AssignFamilyHeadModal';
import { useAuth } from '../../context/AuthContext';

interface Family {
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
}

const FamiliesManagement = () => {
    const { user } = useAuth();
    const [families, setFamilies] = useState<Family[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
    const [showAssignHeadModal, setShowAssignHeadModal] = useState(false);

    const isFellowshipManager = user?.role === 'FELLOWSHIP_MANAGER';

    useEffect(() => {
        fetchFamilies();
    }, []);

    const fetchFamilies = async () => {
        try {
            const response = await api.get('/families');
            setFamilies(response.data);
        } catch (error) {
            console.error('Failed to fetch families:', error);
            toast.error('Failed to load families');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFamily = async (familyId: string) => {
        const family = families.find(f => f.id === familyId);
        if (!family) return;

        if (!confirm(`Delete "${family.name}"?\n\nThis will:\n- Remove all members\n- Deactivate family tags\n- Preserve history`)) {
            return;
        }

        try {
            await api.delete(`/families/${familyId}`);
            toast.success(`${family.name} deleted successfully`);
            fetchFamilies();
        } catch (error: any) {
            console.error('Error deleting family:', error);
            toast.error(error.response?.data?.message || 'Failed to delete family');
        }
    };

    const handleAssignHead = (family: Family) => {
        setSelectedFamily(family);
        setShowAssignHeadModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-400">Loading families...</p>
                </div>
            </div>
        );
    }

    const totalMembers = families.reduce((sum, f) => sum + f._count.members, 0);
    const familiesWithHeads = families.filter(f => f.familyHead).length;

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-4xl font-bold gradient-text mb-2">Families</h1>
                        <p className="text-gray-400">
                            Manage small groups and discipleship families
                        </p>
                    </div>
                    {isFellowshipManager && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-teal-500/50"
                        >
                            <Plus size={20} />
                            Create Family
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Families</p>
                                <p className="text-3xl font-bold text-white">{families.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                                <Users className="text-teal-400" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Families with Heads</p>
                                <p className="text-3xl font-bold text-white">{familiesWithHeads}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Users className="text-green-400" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Members</p>
                                <p className="text-3xl font-bold text-white">{totalMembers}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Users className="text-purple-400" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Families Grid */}
            {families.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <AlertCircle className="text-gray-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2">No Families Yet</h3>
                    <p className="text-gray-400 mb-6">
                        Create your first family to get started
                    </p>
                    {isFellowshipManager && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all inline-flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Create Family
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {families.map((family) => (
                        <FamilyCard
                            key={family.id}
                            family={family}
                            onDelete={isFellowshipManager ? handleDeleteFamily : undefined}
                            onAssignHead={handleAssignHead}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {isFellowshipManager && (
                <CreateFamilyModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchFamilies}
                />
            )}

            {selectedFamily && (
                <AssignFamilyHeadModal
                    isOpen={showAssignHeadModal}
                    onClose={() => {
                        setShowAssignHeadModal(false);
                        setSelectedFamily(null);
                    }}
                    onSuccess={fetchFamilies}
                    family={selectedFamily}
                />
            )}
        </div>
    );
};

export default FamiliesManagement;
