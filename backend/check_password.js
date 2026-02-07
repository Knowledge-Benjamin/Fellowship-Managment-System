const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPassword() {
    const user = await prisma.member.findUnique({
        where: { email: 'manager@fellowship.com' }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User found:', user.email);
    console.log('Stored password hash:', user.password);
    console.log('Hash starts with $2a$ or $2b$?', user.password.startsWith('$2'));

    // Test password
    const testPassword = 'Manager@Fellowship';
    console.log('\nTesting password:', testPassword);

    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('Password matches?', isValid);

    // Also test creating a new hash and comparing
    console.log('\nTesting fresh hash creation:');
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('New hash:', newHash);
    const newHashMatches = await bcrypt.compare(testPassword, newHash);
    console.log('New hash matches?', newHashMatches);

    await prisma.$disconnect();
}

checkPassword().catch(console.error);
