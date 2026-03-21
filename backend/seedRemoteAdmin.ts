import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to remote database...');

  // Ensure a region exists
  let region = await prisma.region.findFirst();
  if (!region) {
    console.log('No region found. Creating Default Region...');
    region = await prisma.region.create({
      data: {
        name: 'Default Region',
      },
    });
  }

  const email = 'makmanifest@gmail.com';
  const password = 'Manager@Fellowship';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existingAdmin = await prisma.member.findUnique({ where: { email } });
  
  if (existingAdmin) {
    console.log('Admin already exists! Updating password and role to be sure...');
    await prisma.member.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'FELLOWSHIP_MANAGER',
      },
    });
    console.log('Admin updated successfully.');
  } else {
    console.log('Creating new admin user...');
    await prisma.member.create({
      data: {
        fullName: 'Mak Manifest Admin',
        email,
        phoneNumber: '0000000000',
        password: hashedPassword,
        role: 'FELLOWSHIP_MANAGER',
        fellowshipNumber: 'ADMIN-001',
        gender: 'MALE',
        regionId: region.id,
      },
    });
    console.log('Admin created successfully.');
  }

  console.log('Seed execution finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
