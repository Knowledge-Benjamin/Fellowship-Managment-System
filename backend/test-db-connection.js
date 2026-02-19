require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Loaded from .env' : '✗ Not found');
  console.log('');

  try {
    console.log('⏳ Attempting to connect...');
    await prisma.$connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    console.log('\n🔍 Querying database info...');
    const result = await prisma.$queryRaw`SELECT current_database() as db_name, version()`;
    console.log('📊 Database:', result[0].db_name);
    console.log('📦 PostgreSQL Version:', result[0].version);
    
    await prisma.$disconnect();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('- PostgreSQL server is not running on 127.0.0.1:5432');
    console.error('- Database "fellowship_manager" does not exist');
    console.error('- Username/password is incorrect');
    console.error('- Firewall is blocking the connection');
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
