import { PrismaClient } from '@prisma/client';

/**
 * PrismaConnectionManager
 * -----------------------------------------------------------------------
 * Maintains a cache of PrismaClient instances, one per unique Neon
 * database URL.  This prevents connection-pool exhaustion by reusing an
 * existing client for every request that belongs to the same tenant.
 *
 * Cache eviction is deliberately minimal for now — connection limits on
 * Neon's free/pro plans are generous and campuses are long-lived tenants.
 * A full LRU + idle-disconnect strategy can be layered on later.
 */

const clientCache = new Map<string, PrismaClient>();

export function getClientForUrl(databaseUrl: string): PrismaClient {
    if (clientCache.has(databaseUrl)) {
        return clientCache.get(databaseUrl)!;
    }

    const client = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    clientCache.set(databaseUrl, client);
    console.log(`[ConnectionManager] New PrismaClient created for tenant. Cache size: ${clientCache.size}`);
    return client;
}

/** Clean up all connections gracefully (called on server shutdown) */
export async function disconnectAll(): Promise<void> {
    const disconnects = Array.from(clientCache.values()).map(c => c.$disconnect());
    await Promise.all(disconnects);
    clientCache.clear();
    console.log('[ConnectionManager] All Prisma connections closed.');
}
