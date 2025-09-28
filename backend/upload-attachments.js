import { PrismaClient } from '@prisma/client';
import cloudinary from './config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mime from 'mime-types';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Helper function to format Rwandan phone number (same as in seed-csv.js)
function formatRwandanPhone(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove any spaces, dashes, or other separators
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // If it already starts with +250, return as is
  if (cleaned.startsWith('+250')) {
    return cleaned;
  }
  
  // If it starts with 250, add the + sign
  if (cleaned.startsWith('250')) {
    return `+${cleaned}`;
  }
  
  // If it's a 9-digit number (typical Rwandan mobile), add +250
  if (cleaned.length === 9 && /^[0-9]{9}$/.test(cleaned)) {
    return `+250${cleaned}`;
  }
  
  // If it's a 10-digit number starting with 0, remove the 0 and add +250
  if (cleaned.length === 10 && cleaned.startsWith('0') && /^0[0-9]{9}$/.test(cleaned)) {
    return `+250${cleaned.substring(1)}`;
  }
  
  // If it's a 12-digit number starting with 250, add the + sign
  if (cleaned.length === 12 && cleaned.startsWith('250') && /^250[0-9]{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  
  // For any other format, return as is (might be invalid)
  console.warn(`Could not format phone number: ${phoneNumber}`);
  return phoneNumber;
}

// Helper function to determine Cloudinary resource type
function getResourceType(mimeType) {
  if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'video'; // Cloudinary uses 'video' for audio files
  } else if (mimeType.startsWith('image/')) {
    return 'image';
  }
  return 'auto';
}

// Helper function to upload file to Cloudinary
async function uploadToCloudinary(filePath, originalName, mimeType) {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(mimeType);
    
    cloudinary.uploader.upload(
      filePath,
      {
        folder: 'resolvet/tickets',
        resource_type: resourceType,
        public_id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
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
  console.log('🚀 Starting attachment upload process...');

  // Test database connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('Cannot proceed without database connection');
    process.exit(1);
  }

  try {
    // Get Mellon user (who will be the uploader)
    const mellonUser = await prisma.user.findFirst({
      where: { 
        email: process.env.MELLON_EMAIL || 'mellon@resolveit.com' 
      }
    });

    if (!mellonUser) {
      console.error('❌ Mellon user not found. Please run seed-csv.js first.');
      process.exit(1);
    }

    console.log(`👤 Using Mellon user: ${mellonUser.first_name} ${mellonUser.last_name}`);

    // Get all tickets with their phone numbers
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        ticket_code: true,
        requester_phone: true,
        subject: true
      }
    });

    console.log(`📋 Found ${tickets.length} tickets in database`);

    // Create a map of formatted phone numbers to tickets
    const phoneToTicketMap = new Map();
    tickets.forEach(ticket => {
      const formattedPhone = formatRwandanPhone(ticket.requester_phone);
      if (formattedPhone) {
        // Remove +250 prefix for folder matching
        const phoneWithoutCountryCode = formattedPhone.replace('+250', '');
        phoneToTicketMap.set(phoneWithoutCountryCode, ticket);
        console.log(`📞 Mapped phone ${phoneWithoutCountryCode} to ticket ${ticket.ticket_code}`);
      }
    });

    // Process attachments folder
    const attachmentsPath = path.join(__dirname, 'Resolveit-attachments', 'Resolveit');
    
    if (!fs.existsSync(attachmentsPath)) {
      console.error(`❌ Attachments folder not found: ${attachmentsPath}`);
      process.exit(1);
    }

    const phoneFolders = fs.readdirSync(attachmentsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📁 Found ${phoneFolders.length} phone number folders`);

    let totalUploaded = 0;
    let totalErrors = 0;
    let processedFolders = 0;

    for (const phoneFolder of phoneFolders) {
      processedFolders++;
      console.log(`\n📂 Processing folder ${processedFolders}/${phoneFolders.length}: ${phoneFolder}`);

      // Find matching ticket
      const ticket = phoneToTicketMap.get(phoneFolder);
      if (!ticket) {
        console.warn(`⚠️  No ticket found for phone number: ${phoneFolder}`);
        totalErrors++;
        continue;
      }

      console.log(`🎫 Found ticket: ${ticket.ticket_code} - ${ticket.subject}`);

      const folderPath = path.join(attachmentsPath, phoneFolder);
      const files = fs.readdirSync(folderPath);

      console.log(`📄 Found ${files.length} files in folder`);

      for (const file of files) {
        try {
          const filePath = path.join(folderPath, file);
          const stats = fs.statSync(filePath);
          
          if (!stats.isFile()) {
            console.warn(`⚠️  Skipping non-file: ${file}`);
            continue;
          }

          // Get MIME type
          const mimeType = mime.lookup(filePath) || 'application/octet-stream';
          
          console.log(`📤 Uploading: ${file} (${mimeType})`);

          // Upload to Cloudinary
          const uploadResult = await uploadToCloudinary(filePath, file, mimeType);

          // Save to database
          const attachment = await prisma.attachment.create({
            data: {
              original_filename: file,
              stored_filename: uploadResult.secure_url,
              mime_type: mimeType,
              size: BigInt(stats.size),
              ticket_id: ticket.id,
              uploaded_by_id: mellonUser.id
            }
          });

          // Create ticket event
          await prisma.ticketEvent.create({
            data: {
              ticket_id: ticket.id,
              user_id: mellonUser.id,
              change_type: 'attachment_added',
              new_value: attachment.stored_filename
            }
          });

          totalUploaded++;
          console.log(`✅ Uploaded: ${file} → ${uploadResult.secure_url}`);

        } catch (error) {
          console.error(`❌ Error uploading ${file}:`, error.message);
          totalErrors++;
        }
      }
    }

    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successfully uploaded: ${totalUploaded} files`);
    console.log(`❌ Failed uploads: ${totalErrors} files`);
    console.log(`📁 Processed folders: ${processedFolders}/${phoneFolders.length}`);
    console.log('\n🎉 Attachment upload completed successfully!');

  } catch (error) {
    console.error('❌ Upload process error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Upload execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
