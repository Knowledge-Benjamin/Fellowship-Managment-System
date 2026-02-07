const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetManagerPassword() {
    console.log('Resetting manager password...');

    // Hash the correct password
    const hashedPassword = await bcrypt.hash('Manager@Fellowship', 10);
    console.log('New hash generated');

    // Update the manager account
    const updated = await prisma.member.update({
        where: { email: 'manager@fellowship.com' },
        data: { password: hashedPassword }
    });

    console.log('✓ Password updated for:', updated.email);
    console.log('  Fellowship Number:', updated.fellowshipNumber);
    console.log('  You can now log in with:');
    console.log('  Email: manager@fellowship.com');
    console.log('  Password: Manager@Fellowship');

    await prisma.$disconnect();
}

resetManagerPassword().catch(console.error);
