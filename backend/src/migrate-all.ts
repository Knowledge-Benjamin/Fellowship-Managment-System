import { execSync } from 'child_process';
import * as bcrypt from 'bcryptjs';
import { getManagementClient, disconnectManagementClient } from './lib/managementClient';
import { PrismaClient } from '@prisma/client';

async function migrateAllDatabases() {
  console.log('[Migrate] Starting global migration process...');
  const managementPrisma = getManagementClient();

  try {
    // 1. Synchronize the Management Database Schema using db push
    // Since management doesn't have a tracked migrations folder, we use db push.
    console.log('[Migrate] Applying schema push to Management Database...');
    execSync('npx prisma db push --accept-data-loss --schema=prisma/schema.management.prisma', { stdio: 'inherit' });
    console.log('[Migrate] Management Database schema pushed successfully.');

    // 2. Seed SuperAdmin account (idempotent — skips if already exists)
    // Credentials are read from env vars — never hardcoded in source.
    const ADMIN_EMAIL = process.env.SYSTEM_ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.SYSTEM_ADMIN_PASSWORD;

    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const existing = await managementPrisma.systemAdmin.findUnique({ where: { email: ADMIN_EMAIL } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await managementPrisma.systemAdmin.create({
          data: { email: ADMIN_EMAIL, passwordHash, fullName: 'Super Admin' },
        });
        console.log(`[Migrate] SuperAdmin created: ${ADMIN_EMAIL}`);
      } else {
        console.log(`[Migrate] SuperAdmin already exists — skipping.`);
      }
    } else {
      console.warn('[Migrate] SYSTEM_ADMIN_EMAIL or SYSTEM_ADMIN_PASSWORD not set — skipping SuperAdmin seed.');
    }

    // 3. Fetch all registered campuses
    console.log('[Migrate] Fetching registered campuses for tenant migrations...');
    const campuses = await managementPrisma.campus.findMany({
      where: { isActive: true }
    });

    console.log(`[Migrate] Found ${campuses.length} active tenant database(s) to migrate.`);

    // 4. Loop through and migrate each tenant database
    for (const campus of campuses) {
      console.log(`\n[Migrate] ----------------------------------------`);
      console.log(`[Migrate] Migrating Tenant: ${campus.name} (${campus.subdomain})`);

      try {
        // Auto-heal stuck migrations (specifically the Event.type enum -> string migration)
        console.log(`[Migrate] Checking for stuck migrations on ${campus.name}...`);
        const tenantPrisma = new PrismaClient({ datasources: { db: { url: campus.databaseUrl } } });
        
        try {
          const result: any = await tenantPrisma.$queryRaw`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Event' AND column_name = 'type'
          `;
          
          if (result && result.length > 0 && result[0].data_type === 'USER-DEFINED') {
              console.log(`[Migrate] Auto-healing: Event.type is still an Enum. Deleting false migration record...`);
              await tenantPrisma.$executeRaw`DELETE FROM _prisma_migrations WHERE migration_name = '20260426130503_change_event_type_to_string'`;
          }
        } catch (healErr: any) {
          console.warn(`[Migrate] Auto-heal check failed (safe to ignore):`, healErr.message);
        } finally {
          await tenantPrisma.$disconnect();
        }

        execSync(`npx prisma migrate deploy --schema=prisma/schema.prisma`, {
          env: {
            ...process.env,
            DATABASE_URL: campus.databaseUrl
          },
          stdio: 'inherit'
        });
        console.log(`[Migrate] Success for ${campus.name}`);
      } catch (err: any) {
        console.error(`[Migrate] ERROR applying migrations for ${campus.name}!`);
        console.error(err.message);
        // Continue attempting the others even if one tenant fails
      }
    }

    console.log(`\n[Migrate] ----------------------------------------`);
    console.log('[Migrate] Global migration process complete!');
  } catch (error) {
    console.error('[Migrate] Fatal error during global migration process:', error);
    process.exit(1);
  } finally {
    await disconnectManagementClient();
  }
}

migrateAllDatabases();
