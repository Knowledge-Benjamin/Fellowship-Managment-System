import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    className?: string;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    required = false,
    disabled = false,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => String(o.value) === String(value));

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Hidden native input for form validation */}
            <input
                type="text"
                required={required}
                value={String(value)}
                readOnly
                className="sr-only"
                tabIndex={-1}
            />

            {/* Trigger */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    input w-full flex items-center justify-between text-left transition-smooth cursor-pointer
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300'}
                    ${isOpen ? 'ring-4' : ''}
                    ${!selectedOption ? 'text-slate-400' : 'text-slate-800'}
                `}
                style={isOpen ? { borderColor: '#48A111', boxShadow: '0 0 0 3px rgba(72,161,17,0.12)' } : undefined}
            >
                <span className="truncate text-sm">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-slate-900/5">
                    <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                disabled={option.disabled}
                                onClick={() => !option.disabled && handleSelect(String(option.value))}
                                className={`
                                    w-full flex items-center justify-between px-4 py-2.5 text-sm text-left
                                    border-b border-slate-50 last:border-0 transition-colors duration-100
                                    ${option.disabled
                                        ? 'text-slate-300 cursor-not-allowed bg-transparent'
                                        : String(value) === String(option.value)
                                            ? 'font-medium'
                                            : `text-slate-700 hover:bg-slate-50 ${option.className || ''}`
                                    }
                                `}
                                style={
                                    !option.disabled && String(value) === String(option.value)
                                        ? { backgroundColor: '#f0fae8', color: '#48A111' }
                                        : undefined
                                }
                            >
                                <span className="truncate">{option.label}</span>
                                {String(value) === String(option.value) && !option.disabled && (
                                    <CheckCircle className="w-4 h-4 shrink-0 ml-2" style={{ color: '#48A111' }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
