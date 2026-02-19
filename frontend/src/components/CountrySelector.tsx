import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import en from 'react-phone-number-input/locale/en.json';
import { Search, X, ChevronDown, CheckCircle } from 'lucide-react';

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
                    flex items-center gap-2 px-3 py-1
                    rounded-lg transition-all duration-200
                    text-white font-bold shadow-sm border-2 border-transparent
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-200' : 'hover:brightness-105 cursor-pointer'}
                    ${isOpen ? 'ring-4 ring-[#F2B50B]/20' : ''}
                `}
                style={{ backgroundColor: '#F2B50B' }}
            >
                <span className="text-xl leading-none">{selectedCountry ? getFlag(selectedCountry.code) : '🌍'}</span>
                <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-slate-900/5 animate-scale-in origin-top-left">
                    {/* Search Input */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search country..."
                                className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredCountries.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                <p>No countries found</p>
                            </div>
                        ) : (
                            filteredCountries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleSelect(country.code)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-2.5
                                        transition-colors duration-150 border-b border-slate-50 last:border-0
                                        ${country.code === value
                                            ? 'bg-teal-50 text-teal-700'
                                            : 'text-slate-700 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <span className="text-2xl leading-none">{getFlag(country.code)}</span>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-medium">{country.name}</div>
                                        <div className="text-xs text-slate-500">+{country.callingCode}</div>
                                    </div>
                                    {country.code === value && (
                                        <CheckCircle className="w-4 h-4 text-teal-500" />
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
