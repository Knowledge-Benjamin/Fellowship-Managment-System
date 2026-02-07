import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import en from 'react-phone-number-input/locale/en.json';
import { Search, X, ChevronDown } from 'lucide-react';

interface CountrySelectorProps {
    value: string;
    onChange: (country: string) => void;
    disabled?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ value, onChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get all countries
    const countries = useMemo(() => {
        return getCountries().map(code => ({
            code,
            name: en[code] || code,
            callingCode: getCountryCallingCode(code),
        }));
    }, []);

    // Filter countries based on search
    const filteredCountries = useMemo(() => {
        if (!searchQuery) return countries;
        const query = searchQuery.toLowerCase();
        return countries.filter(
            country =>
                country.name.toLowerCase().includes(query) ||
                country.code.toLowerCase().includes(query) ||
                country.callingCode.includes(query)
        );
    }, [countries, searchQuery]);

    // Get selected country info
    const selectedCountry = countries.find(c => c.code === value);

    // Focus search when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (countryCode: string) => {
        onChange(countryCode);
        setIsOpen(false);
        setSearchQuery('');
    };

    // Get flag emoji
    const getFlag = (countryCode: string) => {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    flex items-center gap-2 px-3 py-3
                    bg-slate-800/50 border border-slate-700/50
                    rounded-lg transition-all duration-300
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800/70 hover:border-slate-600/50 cursor-pointer'}
                    ${isOpen ? 'border-teal-500 ring-2 ring-teal-500/20' : ''}
                `}
            >
                <span className="text-2xl">{selectedCountry ? getFlag(selectedCountry.code) : '🌍'}</span>
                <span className="text-slate-300 text-sm font-medium">
                    +{selectedCountry?.callingCode || '256'}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search country..."
                                className="w-full pl-10 pr-8 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded"
                                >
                                    <X className="w-3 h-3 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredCountries.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                No countries found
                            </div>
                        ) : (
                            filteredCountries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleSelect(country.code)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-2.5
                                        transition-colors duration-150
                                        ${country.code === value
                                            ? 'bg-teal-500/20 text-teal-300'
                                            : 'text-slate-300 hover:bg-slate-700/50'
                                        }
                                    `}
                                >
                                    <span className="text-2xl">{getFlag(country.code)}</span>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-medium">{country.name}</div>
                                        <div className="text-xs text-slate-500">+{country.callingCode}</div>
                                    </div>
                                    {country.code === value && (
                                        <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CountrySelector;
