import { execSync } from 'child_process';
import { getManagementClient, disconnectManagementClient } from './lib/managementClient';

async function migrateAllDatabases() {
  console.log('[Migrate] Starting global migration process...');
  const managementPrisma = getManagementClient();

  try {
    // 1. Synchronize the Management Database Schema using db push
    // Since management doesn't have a tracked migrations folder, we use db push.
    console.log('[Migrate] Applying schema push to Management Database...');
    execSync('npx prisma db push --accept-data-loss --schema=prisma/schema.management.prisma', { stdio: 'inherit' });
    console.log('[Migrate] Management Database schema pushed successfully.');

    // 2. Fetch all registered campuses
    console.log('[Migrate] Fetching registered campuses for tenant migrations...');
    const campuses = await managementPrisma.campus.findMany({
      where: { isActive: true }
    });

    console.log(`[Migrate] Found ${campuses.length} active tenant database(s) to migrate.`);

    // 3. Loop through and migrate each tenant database
    for (const campus of campuses) {
      console.log(`\n[Migrate] ----------------------------------------`);
      console.log(`[Migrate] Migrating Tenant: ${campus.name} (${campus.subdomain})`);
      
      try {
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
        // We continue attempting the others even if one tenant fails
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
