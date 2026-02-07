import React from 'react';
import { UserPlus, Database, ArrowRightLeft, RotateCcw } from 'lucide-react';

type RegistrationMode = 'NEW_MEMBER' | 'LEGACY_IMPORT' | 'TRANSFER' | 'READMISSION';

interface RegistrationModeSelectorProps {
    value: RegistrationMode;
    onChange: (mode: RegistrationMode) => void;
}

interface ModeOption {
    value: RegistrationMode;
    label: string;
    description: string;
    icon: any;
    autoAssignTag: boolean | null; // true = auto-assign, false = skip, null = manual decision
}

const modes: ModeOption[] = [
    {
        value: 'NEW_MEMBER',
        label: 'New Member',
        description: 'First-time fellowship registration',
        icon: UserPlus,
        autoAssignTag: true,
    },
    {
        value: 'LEGACY_IMPORT',
        label: 'Legacy Import',
        description: 'Existing member from pre-system era',
        icon: Database,
        autoAssignTag: false,
    },
    {
        value: 'TRANSFER',
        label: 'Transfer',
        description: 'Transferring from another fellowship',
        icon: ArrowRightLeft,
        autoAssignTag: null, // Manual decision
    },
    {
        value: 'READMISSION',
        label: 'Readmission',
        description: 'Returning after absence',
        icon: RotateCcw,
        autoAssignTag: false,
    },
];

export const RegistrationModeSelector: React.FC<RegistrationModeSelectorProps> = ({ value, onChange }) => {
    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">
                Registration Mode
                <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = value === mode.value;

                    return (
                        <button
                            key={mode.value}
                            type="button"
                            onClick={() => onChange(mode.value)}
                            className={`
                                p-4 rounded-xl border-2 transition-all text-left
                                flex flex-col gap-2 hover:scale-[1.02] active:scale-[0.98]
                                ${isSelected
                                    ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/20'
                                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`
                                    p-2 rounded-lg 
                                    ${isSelected ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700/50 text-slate-400'}
                                `}>
                                    <Icon size={20} />
                                </div>
                                <h3 className={`font-semibold ${isSelected ? 'text-teal-400' : 'text-slate-300'}`}>
                                    {mode.label}
                                </h3>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {mode.description}
                            </p>
                            {mode.autoAssignTag !== null && (
                                <div className="mt-1 px-2 py-1 rounded-md bg-slate-900/50 border border-slate-700">
                                    <p className="text-xs text-slate-400">
                                        {mode.autoAssignTag
                                            ? '✓ Auto-assigns first-timer tag'
                                            : '✗ No first-timer tag'}
                                    </p>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default RegistrationModeSelector;
