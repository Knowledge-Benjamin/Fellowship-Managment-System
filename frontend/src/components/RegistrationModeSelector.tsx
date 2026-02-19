import React from 'react';
import { UserPlus, Database, ArrowRightLeft, RotateCcw } from 'lucide-react';
import CustomSelect from './CustomSelect';

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
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
                Registration Mode
                <span className="text-red-500 ml-1">*</span>
            </label>
            <CustomSelect
                value={value}
                onChange={(v) => onChange(v as RegistrationMode)}
                className="w-1/5"
                options={modes.map(mode => ({
                    value: mode.value,
                    label: `${mode.label} - ${mode.description}`,
                }))}
            />
            <p className="text-xs text-slate-500 mt-1">
                {modes.find(m => m.value === value)?.autoAssignTag === true && '✓ Auto-assigns first-timer tag'}
                {modes.find(m => m.value === value)?.autoAssignTag === false && '✗ No first-timer tag'}
                {modes.find(m => m.value === value)?.autoAssignTag === null && 'ℹ Manual decision required'}
            </p>
        </div>
    );
};

export default RegistrationModeSelector;

