import { Request, Response, NextFunction } from 'express';
import { getClientForUrl } from '../lib/prismaConnectionManager';

/**
 * Tenant Resolution Strategy
 * -----------------------------------------------------------------------
 * 1.  The frontend sends `X-Campus-Domain: tamu` (just the subdomain) in
 *     every authenticated request header.
 * 2.  We look up the corresponding DATABASE_URL from either:
 *       a) An environment variable  →  DATABASE_URL_<SUBDOMAIN_UPPER>
 *          e.g. DATABASE_URL_TAMU=postgres://...
 *       b) (Phase 3) A row in the Management / Control Plane DB.
 * 3.  We instantiate (or reuse a cached) PrismaClient for that URL and
 *     attach it to `req.prisma`.
 * 4.  Any route that calls `(req as any).prisma` will automatically talk
 *     to the correct isolated campus database.
 *
 * FALLBACK:  If no X-Campus-Domain header is present, we fall back to the
 * monolith DATABASE_URL for backwards-compatible local development.
 */

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
        const subdomain = req.headers['x-campus-domain'] as string | undefined;

        let databaseUrl: string | undefined;

        if (subdomain) {
            // Look for a campus-specific override variable first
            const envKey = `DATABASE_URL_${subdomain.toUpperCase().replace(/-/g, '_')}`;
            databaseUrl = process.env[envKey];

            if (!databaseUrl) {
                // Campus is registered but env var missing — refuse the request to prevent
                // accidental cross-tenant data bleed into the fallback DB.
                res.status(503).json({
                    error: 'Campus database not configured.',
                    detail: `No database URL found for campus: ${subdomain}. Contact your system administrator.`,
                });
                return;
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
        (req as any).prisma = getClientForUrl(databaseUrl);

        next();
    } catch (err) {
        console.error('[TenantMiddleware] Unexpected error:', err);
        res.status(500).json({ error: 'Failed to resolve tenant database connection.' });
    }
}
