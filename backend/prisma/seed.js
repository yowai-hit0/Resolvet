import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/apiError.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  try {
    // Create ticket priorities
    const priorities = await Promise.all([
      prisma.ticketPriority.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: 'Medium' }
      }),
      prisma.ticketPriority.upsert({
        where: { id: 2 },
        update: {},
        create: { id: 2, name: 'High' }
      }),
      prisma.ticketPriority.upsert({
        where: { id: 3 },
        update: {},
        create: { id: 3, name: 'Low' }
      }),
      prisma.ticketPriority.upsert({
        where: { id: 4 },
        update: {},
        create: { id: 4, name: 'Critical' }
      })
    ]);

    console.log('Created priorities:', priorities.map(p => p.name));

    // Create some tags
    const tags = await Promise.all([
      prisma.tag.upsert({
        where: { name: 'authentication' },
        update: {},
        create: { name: 'authentication' }
      }),
      prisma.tag.upsert({
        where: { name: 'billing' },
        update: {},
        create: { name: 'billing' }
      }),
      prisma.tag.upsert({
        where: { name: 'bug' },
        update: {},
        create: { name: 'bug' }
      })
    ]);

    console.log('Created tags:', tags.map(t => t.name));

    // Hash password for default users
    const saltRounds = 12;
    const adminPasswordPlain = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
    const adminPassword = await bcrypt.hash(adminPasswordPlain, saltRounds);
    const superAdminPasswordPlain = process.env.SUPER_ADMIN_SEED_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';
    const superAdminPassword = await bcrypt.hash(superAdminPasswordPlain, saltRounds);

    // Create default admin user (optional)
    const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@resolveit.com';
    const adminUser = await prisma.user.upsert({
      where: { email: defaultAdminEmail },
      update: {},
      create: {
        email: defaultAdminEmail,
        password_hash: adminPassword,
        first_name: process.env.DEFAULT_ADMIN_FIRST_NAME || 'Maria',
        last_name: process.env.DEFAULT_ADMIN_LAST_NAME || 'Garcia',
        role: 'admin'
      }
    });

    // Ensure a Super Admin user exists (env-configurable)
    const superAdminEmail = process.env.SUPER_ADMIN_SEED_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'superadmin@resolveit.com';
    const superAdminUser = await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: { role: 'super_admin' },
      create: {
        email: superAdminEmail,
        password_hash: superAdminPassword,
        first_name: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
        last_name: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
        role: 'super_admin'
      }
    });

    // Skipping seeding default agent and customer users per deployment preference

    console.log('Created users:', [
      `${adminUser.first_name} ${adminUser.last_name} (${adminUser.role})`,
      `${superAdminUser.first_name} ${superAdminUser.last_name} (${superAdminUser.role})`
    ]);

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    throw new ApiError(500, 'Seed failed', [error.message]);
  }
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });