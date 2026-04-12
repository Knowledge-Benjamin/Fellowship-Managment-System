import { Request, Response, NextFunction } from 'express';
import { getClientForUrl } from '../lib/prismaConnectionManager';
import { getManagementClient } from '../lib/managementClient';

// Cache to prevent hitting the management database on every single API request
const subdomainToUrlCache = new Map<string, string>();

/**
 * Tenant Resolution Strategy
 * -----------------------------------------------------------------------
 * 1.  The frontend sends `X-Campus-Domain: tamu` (just the subdomain) in
 *     every authenticated request header.
 * 2.  We look up the corresponding DATABASE_URL from either:
 *       a) In-memory Cache.
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
            // 1. Check in-memory cache
            if (subdomainToUrlCache.has(subdomain)) {
                databaseUrl = subdomainToUrlCache.get(subdomain);
            } else {
                // 2. Look for a campus-specific override variable
                const envKey = `DATABASE_URL_${subdomain.toUpperCase().replace(/-/g, '_')}`;
                databaseUrl = process.env[envKey];

                // 3. Query the Management Database
                if (!databaseUrl) {
                    try {
                        const managementPrisma = getManagementClient();
                        const campus = await managementPrisma.campus.findUnique({
                            where: { subdomain },
                            select: { databaseUrl: true, isActive: true }
                        });

                        if (campus && campus.isActive) {
                            databaseUrl = campus.databaseUrl;
                        }
                    } catch (dbError) {
                        console.error('[TenantMiddleware] Error querying management database:', dbError);
                    }
                }

                if (databaseUrl) {
                    subdomainToUrlCache.set(subdomain, databaseUrl);
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

        next();
    } catch (err) {
        console.error('[TenantMiddleware] Unexpected error:', err);
        res.status(500).json({ error: 'Failed to resolve tenant database connection.' });
    }
}
