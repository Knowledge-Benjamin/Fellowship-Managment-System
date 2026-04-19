import { Request, Response, NextFunction } from 'express';
import { getClientForUrl } from '../lib/prismaConnectionManager';
import { getManagementClient } from '../lib/managementClient';

// Cache to prevent hitting the management database on every single API request
// Added a 60-second TTL (Time-To-Live) to securely enforce Campus suspensions network-wide.
interface CacheEntry {
    url: string;
    expiresAt: number;
}
const subdomainToUrlCache = new Map<string, CacheEntry>();

/**
 * Tenant Resolution Strategy
 * -----------------------------------------------------------------------
 * 1.  The frontend sends `X-Campus-Domain: tamu` (just the subdomain) in
 *     every authenticated request header.
 * 2.  We look up the corresponding DATABASE_URL from either:
 *       a) In-memory Cache (TTL Validated).
 *       b) An environment variable (DATABASE_URL_<SUBDOMAIN_UPPER>).
 *       c) (Phase 3) A row in the Management / Control Plane DB.
 * 3.  We instantiate (or reuse a cached) PrismaClient for that URL and
 *     attach it to `req.prisma`.
 * 4.  Any route that calls `(req as any).prisma` will automatically talk
 *     to the correct isolated campus database.
 */

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const subdomain = req.headers['x-campus-domain'] as string | undefined;

        let databaseUrl: string | undefined;

        if (subdomain) {
            // 1. Check in-memory TTL cache
            const cacheHit = subdomainToUrlCache.get(subdomain);
            if (cacheHit && cacheHit.expiresAt > Date.now()) {
                databaseUrl = cacheHit.url;
            } else {
                // Remove expired cache if it exists
                if (cacheHit) subdomainToUrlCache.delete(subdomain);

                // 2. Look for a campus-specific override variable
                const envKey = `DATABASE_URL_${subdomain.toUpperCase().replace(/-/g, '_')}`;
                databaseUrl = process.env[envKey];

                // 3. Query the Management Database
                if (!databaseUrl) {
                    try {
                        const managementPrisma = getManagementClient();
                        const campus = await managementPrisma.campus.findUnique({
                            where: { subdomain },
                            // Check isDeleted manually so we do not cache deleted campuses
                            select: { databaseUrl: true, isActive: true, isDeleted: true }
                        });

                        if (campus && !campus.isDeleted && campus.isActive) {
                            databaseUrl = campus.databaseUrl;
                        } else if (campus && (!campus.isActive || campus.isDeleted)) {
                            res.status(403).json({
                                error: 'Campus access is restricted.',
                                detail: campus.isDeleted 
                                    ? `The campus '${subdomain}' has been archived.` 
                                    : `The campus '${subdomain}' has been temporarily suspended. Please contact the System Administrator.`,
                            });
                            return;
                        }
                    } catch (dbError) {
                        console.error('[TenantMiddleware] Error querying management database:', dbError);
                    }
                }

                if (databaseUrl) {
                    // Set cache with 60-second TTL
                    subdomainToUrlCache.set(subdomain, { 
                        url: databaseUrl, 
                        expiresAt: Date.now() + 60000 
                    });
                } else {
                    res.status(503).json({
                        error: 'Campus database not configured.',
                        detail: `No database URL found for campus: ${subdomain}. Contact your system administrator.`,
                    });
                    return;
                }
            }
        } else {
            // No subdomain header → monolith / local dev fallback
            databaseUrl = process.env.DATABASE_URL;

            if (!databaseUrl) {
                res.status(500).json({ error: 'Server misconfiguration: DATABASE_URL is not set.' });
                return;
            }
        }

        // Attach the correct PrismaClient instance for this request lifecycle
        // (databaseUrl is guaranteed to be a string here due to the early returns)
        (req as any).prisma = getClientForUrl(databaseUrl as string);
        (req as any).tenantSubdomain = subdomain || undefined;

        next();
    } catch (err) {
        console.error('[TenantMiddleware] Unexpected error:', err);
        res.status(500).json({ error: 'Failed to resolve tenant database connection.' });
    }
}
