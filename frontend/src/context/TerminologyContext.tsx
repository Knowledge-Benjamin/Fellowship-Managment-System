import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Terminology {
    /** Top-level geographic/demographic grouping.  Default: "Region" */
    Region: string;
    /** Second-tier pastoral care grouping.  Default: "Family" */
    FamilyGroup: string;
    /** Service/Department grouping.  Default: "Ministry Team" */
    MinistryTeam: string;
    /** Title of the senior leader of the campus.  Default: "Fellowship Manager" */
    FellowshipManager: string;
}

export interface TenantConfig {
    terminology: Terminology;
    primaryColor?: string;
    logoUrl?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TERMINOLOGY: Terminology = {
    Region: 'Region',
    FamilyGroup: 'Family',
    MinistryTeam: 'Ministry Team',
    FellowshipManager: 'Fellowship Manager',
};

const DEFAULT_CONFIG: TenantConfig = {
    terminology: DEFAULT_TERMINOLOGY,
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface TerminologyContextValue {
    /** The full tenant config (terminology + styling) */
    config: TenantConfig;
    /** Shorthand accessor: config.terminology */
    t: Terminology;
    /** True while the first fetch is in-flight */
    isLoading: boolean;
}

const TerminologyContext = createContext<TerminologyContextValue>({
    config: DEFAULT_CONFIG,
    t: DEFAULT_TERMINOLOGY,
    isLoading: true,
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function TerminologyProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<TenantConfig>(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api
            .get<TenantConfig>('/system/config/tenant')
            .then((res) => {
                const data = res.data;
                setConfig({
                    ...DEFAULT_CONFIG,
                    ...data,
                    terminology: {
                        ...DEFAULT_TERMINOLOGY,
                        ...(data.terminology ?? {}),
                    },
                });
            })
            .catch(() => {
                // Network error / management DB not yet set up → use defaults silently
                setConfig(DEFAULT_CONFIG);
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <TerminologyContext.Provider value={{ config, t: config.terminology, isLoading }}>
            {children}
        </TerminologyContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Usage:
 *   const { t } = useTerminology();
 *   <h1>Manage {t.FamilyGroup}s</h1>
 *   // → "Manage Families" for Makerere, "Manage Life Groups" for TAMU
 */
export function useTerminology(): TerminologyContextValue {
    return useContext(TerminologyContext);
}
