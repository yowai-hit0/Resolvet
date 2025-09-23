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
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const superAdminPassword = await bcrypt.hash(process.env.SUPER_ADMIN_SEED_PASSWORD || 'superadmin123', saltRounds);
    const agentPassword = await bcrypt.hash('agent123', saltRounds);
    const customerPassword = await bcrypt.hash('customer123', saltRounds);

    // Create default admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@resolveit.com' },
      update: {},
      create: {
        email: 'admin@resolveit.com',
        password_hash: adminPassword,
        first_name: 'Maria',
        last_name: 'Garcia',
        role: 'admin'
      }
    });

    // Ensure a Super Admin user exists (env-configurable)
    const superAdminEmail = process.env.SUPER_ADMIN_SEED_EMAIL || 'superadmin@resolveit.com';
    const superAdminUser = await prisma.user.upsert({
      where: { email: superAdminEmail },
      update: { role: 'super_admin' },
      create: {
        email: superAdminEmail,
        password_hash: superAdminPassword,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin'
      }
    });

    // Create default agent user
    const agentUser = await prisma.user.upsert({
      where: { email: 'jane.agent@resolveit.com' },
      update: {},
      create: {
        email: 'jane.agent@resolveit.com',
        password_hash: agentPassword,
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'agent'
      }
    });

    // Create default customer user
    const customerUser = await prisma.user.upsert({
      where: { email: 'customer@example.com' },
      update: {},
      create: {
        email: 'customer@example.com',
        password_hash: customerPassword,
        first_name: 'John',
        last_name: 'Doe',
        role: 'customer'
      }
    });

    console.log('Created users:', [
      `${adminUser.first_name} ${adminUser.last_name} (${adminUser.role})`,
      `${superAdminUser.first_name} ${superAdminUser.last_name} (${superAdminUser.role})`,
      `${agentUser.first_name} ${agentUser.last_name} (${agentUser.role})`,
      `${customerUser.first_name} ${customerUser.last_name} (${customerUser.role})`
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