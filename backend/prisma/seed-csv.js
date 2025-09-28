import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Helper function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    data.push(row);
  }
  
  return data;
}

// Helper function to map CSV status to database status
function mapStatus(csvStatus) {
  const statusMap = {
    'completed': 'Closed',
    'new': 'New',
    'assigned': 'Assigned',
    'in_progress': 'In_Progress',
    'on_hold': 'On_Hold',
    'resolved': 'Resolved',
    'reopened': 'Reopened'
  };
  return statusMap[csvStatus?.toLowerCase()] || 'New';
}

// Helper function to map CSV priority to database priority
function mapPriority(csvPriority) {
  const priorityMap = {
    'low': 3,    // Low priority
    'medium': 1, // Medium priority
    'high': 2,   // High priority
    'critical': 4 // Critical priority
  };
  return priorityMap[csvPriority?.toLowerCase()] || 1; // Default to Medium
}

// Helper function to parse date
function parseDate(dateString) {
  if (!dateString) return null;
  try {
    // Handle format like "9/6/2025 11:28:00"
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn(`Failed to parse date: ${dateString}`);
    return null;
  }
}

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Starting CSV seed...');

  // Test database connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('Cannot proceed without database connection');
    process.exit(1);
  }

  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'Resolveit - Sheet1.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvData = parseCSV(csvContent);
    
    console.log(`Found ${csvData.length} tickets in CSV`);

    // Create ticket priorities if they don't exist (complete replacement for seed.js)
    console.log('Creating ticket priorities...');
    const priorities = [];
    
    try {
      const priorityData = [
        { id: 1, name: 'Medium' },
        { id: 2, name: 'High' },
        { id: 3, name: 'Low' },
        { id: 4, name: 'Critical' }
      ];

      for (const priority of priorityData) {
        const created = await prisma.ticketPriority.upsert({
          where: { id: priority.id },
          update: {},
          create: priority
        });
        priorities.push(created);
        console.log(`✅ Created/verified priority: ${created.name}`);
      }
    } catch (error) {
      console.error('Error creating priorities:', error);
      throw error;
    }

    console.log('Created/verified priorities:', priorities.map(p => p.name));

    // Create users (complete replacement for seed.js)
    console.log('Creating users...');
    
    // Hash passwords
    const saltRounds = 12;
    const superAdminPasswordPlain = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';
    const superAdminPassword = await bcrypt.hash(superAdminPasswordPlain, saltRounds);
    
    const mellonPasswordPlain = process.env.MELLON_PASSWORD || 'mellon123';
    const mellonPassword = await bcrypt.hash(mellonPasswordPlain, saltRounds);

    // Create Super Admin user
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@resolveit.com';
    console.log(`Creating Super Admin: ${superAdminEmail}`);
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
    console.log(`✅ Super Admin created: ${superAdminUser.first_name} ${superAdminUser.last_name}`);

    // Create Mellon Admin user (the one who will own the tickets)
    const mellonEmail = process.env.MELLON_EMAIL || 'mellon@resolveit.com';
    console.log(`Creating Mellon Admin: ${mellonEmail}`);
    const mellonUser = await prisma.user.upsert({
      where: { email: mellonEmail },
      update: { role: 'admin' },
      create: {
        email: mellonEmail,
        password_hash: mellonPassword,
        first_name: process.env.MELLON_FIRST_NAME || 'Mellon',
        last_name: process.env.MELLON_LAST_NAME || 'Admin',
        role: 'admin'
      }
    });
    console.log(`✅ Mellon Admin created: ${mellonUser.first_name} ${mellonUser.last_name}`);

    console.log('Created users:', [
      `${superAdminUser.first_name} ${superAdminUser.last_name} (${superAdminUser.role})`,
      `${mellonUser.first_name} ${mellonUser.last_name} (${mellonUser.role})`
    ]);

    // Create tags based on CSV categories
    const categoryTags = new Set();
    csvData.forEach(row => {
      if (row['Category/Type']) {
        categoryTags.add(row['Category/Type'].toLowerCase().replace(/[^a-z0-9]/g, '_'));
      }
    });

    const tags = [];
    for (const tagName of categoryTags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName }
      });
      tags.push(tag);
    }

    console.log('Created tags:', tags.map(t => t.name));

    // Import tickets
    console.log('Importing tickets from CSV...');
    const importedTickets = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of csvData) {
      try {
        // Skip if ticket_code is empty
        if (!row.ticket_code) {
          console.warn(`⚠️  Skipping row with empty ticket_code`);
          errorCount++;
          continue;
        }

        console.log(`📝 Processing ticket: ${row.ticket_code}`);

        const ticketData = {
          ticket_code: row.ticket_code,
          subject: row.subject || 'No Subject',
          description: row['Description/Details'] || 'No description provided',
          requester_name: row.requester_name || null,
          requester_phone: row.requester_number || '000-000-000',
          location: row.Location || null,
          status: mapStatus(row.status),
          created_at: parseDate(row.created_at) || new Date(),
          updated_at: parseDate(row.updated_at) || new Date(),
          resolved_at: parseDate(row.resolved_at),
          closed_at: parseDate(row.closed_at),
          created_by_id: mellonUser.id, // Mellon creates the tickets
          assignee_id: mellonUser.id,   // Mellon is assigned to them
          priority_id: mapPriority(row.priority_id)
        };

        const ticket = await prisma.ticket.upsert({
          where: { ticket_code: row.ticket_code },
          update: ticketData,
          create: ticketData
        });

        // Add tags to ticket
        if (row['Category/Type']) {
          const tagName = row['Category/Type'].toLowerCase().replace(/[^a-z0-9]/g, '_');
          const tag = tags.find(t => t.name === tagName);
          
          if (tag) {
            await prisma.ticketTag.upsert({
              where: {
                ticket_id_tag_id: {
                  ticket_id: ticket.id,
                  tag_id: tag.id
                }
              },
              update: {},
              create: {
                ticket_id: ticket.id,
                tag_id: tag.id
              }
            });
          }
        }

        // Add internal notes as comments if they exist
        if (row['Internal Notes']) {
          await prisma.comment.create({
            data: {
              content: row['Internal Notes'],
              is_internal: true,
              ticket_id: ticket.id,
              author_id: mellonUser.id
            }
          });
        }

        importedTickets.push(ticket);
        successCount++;
        console.log(`✅ Imported ticket: ${ticket.ticket_code} - ${ticket.subject}`);

      } catch (error) {
        console.error(`❌ Error importing ticket ${row.ticket_code}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount} tickets`);
    console.log(`❌ Failed imports: ${errorCount} tickets`);
    console.log(`📋 Total processed: ${csvData.length} tickets`);
    console.log('\n🎉 CSV seed completed successfully!');

  } catch (error) {
    console.error('CSV seed error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('CSV seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
