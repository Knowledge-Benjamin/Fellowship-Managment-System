import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { E164Number } from 'libphonenumber-js/core';
import { parsePhoneNumber, getCountryCallingCode, getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';
import CountrySelector from './CountrySelector';

interface PhoneInputProps {
    value: E164Number | undefined;
    onChange: (value: E164Number | undefined) => void;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    required = false,
    disabled = false,
    placeholder = 'Enter phone number',
}) => {
    const [country, setCountry] = useState<string>('UG');
    const [nationalNumber, setNationalNumber] = useState<string>('');
    const isInitialMount = useRef(true);

    // Calculate max length for current country
    const maxLength = useMemo(() => {
        try {
            const exampleNumber = getExampleNumber(country as any, examples);
            if (exampleNumber) {
                return exampleNumber.nationalNumber.length;
            }
        } catch (error) {
            // Fallback to reasonable default
        }
        return 15; // Default max length
    }, [country]);

    // Only parse value on initial mount
    useEffect(() => {
        if (isInitialMount.current && value) {
            try {
                const parsed = parsePhoneNumber(value);
                if (parsed) {
                    setCountry(parsed.country || 'UG');
                    setNationalNumber(parsed.nationalNumber);
                }
            } catch (error) {
                // Invalid phone number, keep defaults
            }
            isInitialMount.current = false;
        }
    }, [value]);

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // Allow only digits and common formatting characters
        const cleaned = input.replace(/[^\d\s()-]/g, '');

        // Get digits only for length check
        const digitsOnly = cleaned.replace(/\D/g, '');

        // Enforce max length
        if (digitsOnly.length > maxLength) {
            return; // Don't update if exceeds max length
        }

        setNationalNumber(cleaned);

        // Build E164 and notify parent immediately
        if (!cleaned) {
            onChange(undefined);
        } else {
            try {
                const callingCode = getCountryCallingCode(country as any);
                const digitsOnly = cleaned.replace(/\D/g, '');
                const e164 = `+${callingCode}${digitsOnly}`;
                onChange(e164 as E164Number);
            } catch (error) {
                onChange(undefined);
            }
        }
    };

    const handleCountryChange = (newCountry: string) => {
        setCountry(newCountry);

        // Calculate max length for new country
        let newMaxLength = 15;
        try {
            const exampleNumber = getExampleNumber(newCountry as any, examples);
            if (exampleNumber) {
                newMaxLength = exampleNumber.nationalNumber.length;
            }
        } catch (error) {
            // Use default
        }

        // Truncate number if it exceeds new country's max length
        let updatedNumber = nationalNumber;
        const digitsOnly = nationalNumber.replace(/\D/g, '');
        if (digitsOnly.length > newMaxLength) {
            // Truncate to new max length
            const truncated = digitsOnly.substring(0, newMaxLength);
            updatedNumber = truncated;
            setNationalNumber(truncated);
        }

        // Update E164 with new country code
        if (updatedNumber) {
            try {
                const callingCode = getCountryCallingCode(newCountry as any);
                const digitsOnly = updatedNumber.replace(/\D/g, '');
                const e164 = `+${callingCode}${digitsOnly}`;
                onChange(e164 as E164Number);
            } catch (error) {
                onChange(undefined);
            }
        }
    };

    return (
        <div className="phone-input-custom flex items-center gap-2">
            <CountrySelector
                value={country}
                onChange={handleCountryChange}
                disabled={disabled}
            />
            <input
                type="tel"
                value={nationalNumber}
                onChange={handleNumberChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className="flex-1 input transition-smooth text-base"
            />
        </div>
    );
};

export default PhoneInput;
