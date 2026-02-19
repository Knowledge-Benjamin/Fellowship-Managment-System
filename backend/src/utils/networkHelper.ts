import dns from 'dns';

/**
 * Checks for internet connectivity by attempting to resolve a reliable DNS address.
 * Uses Google Public DNS (8.8.8.8) as the target.
 * @returns Promise<boolean> true if connected, false otherwise
 */
export const checkConnectivity = (): Promise<boolean> => {
    return new Promise((resolve) => {
        dns.lookup('google.com', (err) => {
            if (err && err.code === 'ENOTFOUND') {
                resolve(false);
            } else {
                resolve(true); // Connected or other error (e.g., timeout but DNS resolved)
            }
        });
    });
};
