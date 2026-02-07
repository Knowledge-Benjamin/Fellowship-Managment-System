/**
 * Display Formatting Utilities
 * 
 * Provides functions to format region and residence names for display
 * without modifying database values. Ensures consistent uppercase
 * presentation across the application.
 */

/**
 * Formats a region name for display
 * - Converts to uppercase
 * - Appends "(HALLS OF RESIDENTS)" to Central region
 * 
 * @param name - Original region name from database
 * @returns Formatted region name in uppercase
 * 
 * @example
 * formatRegionName("central") // "CENTRAL (HALLS OF RESIDENTS)"
 * formatRegionName("kikoni") // "KIKONI"
 */
export const formatRegionName = (name: string | null | undefined): string => {
    if (!name) return '';

    const trimmed = name.trim();
    const uppercase = trimmed.toUpperCase();

    // Special handling for Central region
    if (uppercase === 'CENTRAL') {
        return 'CENTRAL (HALLS OF RESIDENTS)';
    }

    return uppercase;
};

/**
 * Formats a residence name for display
 * - Converts to uppercase
 * 
 * @param name - Original residence name from database
 * @returns Formatted residence name in uppercase
 * 
 * @example
 * formatResidenceName("mary stuart hall") // "MARY STUART HALL"
 */
export const formatResidenceName = (name: string | null | undefined): string => {
    if (!name) return '';
    return name.trim().toUpperCase();
};

/**
 * Transforms a region object for display by formatting the name
 * Creates a new object to avoid mutating the original
 * 
 * @param region - Region object from database
 * @returns New region object with formatted name
 */
export const formatRegionForDisplay = <T extends { name: string }>(region: T): T => {
    if (!region) return region;

    return {
        ...region,
        name: formatRegionName(region.name),
    };
};

/**
 * Transforms a residence object for display by formatting the name
 * Creates a new object to avoid mutating the original
 * 
 * @param residence - Residence object from database
 * @returns New residence object with formatted name
 */
export const formatResidenceForDisplay = <T extends { name: string }>(residence: T): T => {
    if (!residence) return residence;

    return {
        ...residence,
        name: formatResidenceName(residence.name),
    };
};

/**
 * Transforms an array of regions for display
 * 
 * @param regions - Array of region objects
 * @returns Array of regions with formatted names
 */
export const formatRegionsForDisplay = <T extends { name: string }>(regions: T[]): T[] => {
    if (!regions || !Array.isArray(regions)) return regions;
    return regions.map(formatRegionForDisplay);
};

/**
 * Transforms an array of residences for display
 * 
 * @param residences - Array of residence objects
 * @returns Array of residences with formatted names
 */
export const formatResidencesForDisplay = <T extends { name: string }>(residences: T[]): T[] => {
    if (!residences || !Array.isArray(residences)) return residences;
    return residences.map(formatResidenceForDisplay);
};
