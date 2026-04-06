/**
 * Management Prisma Client
 * -----------------------------------------------------------------------
 * This client connects to the Control Plane (Management) database — NOT a
 * campus database.  It is used exclusively by the System Admin API to
 * read/write the Campus registry and SystemAdmin accounts.
 *
 * It deliberately uses a DIFFERENT client instance and a DIFFERENT env var
 * (MANAGEMENT_DATABASE_URL) from the per-campus clients to maintain complete
 * isolation.
 */

// The management client is generated to a non-default output location.
// We import directly from that location.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — generated path, exists after `prisma generate --schema=prisma/schema.management.prisma`
import { PrismaClient as ManagementPrismaClient } from '../../node_modules/.prisma/management-client';

let managementClient: ManagementPrismaClient | null = null;

export function getManagementClient(): ManagementPrismaClient {
    if (!managementClient) {
        if (!process.env.MANAGEMENT_DATABASE_URL) {
            throw new Error(
                'MANAGEMENT_DATABASE_URL is not set. The Control Plane database is not configured.'
            );
        }
        managementClient = new ManagementPrismaClient();
        console.log('[ManagementDB] Management Prisma Client initialised.');
    }
    return managementClient;
}

export async function disconnectManagementClient(): Promise<void> {
    if (managementClient) {
        await managementClient.$disconnect();
        managementClient = null;
    }
}
