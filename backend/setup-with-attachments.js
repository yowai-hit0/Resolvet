import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting complete setup with CSV import and attachment upload...\n');

// Function to run a script and wait for completion
function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`📋 Running ${scriptName}...`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scriptName} completed successfully\n`);
        resolve();
      } else {
        console.error(`❌ ${scriptName} failed with exit code ${code}\n`);
        reject(new Error(`${scriptName} failed`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error running ${scriptName}:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  try {
    // Step 1: Run CSV seed
    await runScript('./prisma/seed-csv.js', 'CSV Import');
    
    // Step 2: Run attachment upload
    await runScript('./upload-attachments.js', 'Attachment Upload');
    
    console.log('🎉 Complete setup finished successfully!');
    console.log('\n📊 What was created:');
    console.log('✅ Ticket priorities (Medium, High, Low, Critical)');
    console.log('✅ Super Admin user');
    console.log('✅ Mellon Admin user');
    console.log('✅ 23 tickets from CSV');
    console.log('✅ Tags based on ticket categories');
    console.log('✅ Internal notes as comments');
    console.log('✅ All attachments uploaded to Cloudinary');
    console.log('✅ Attachment records in database');
    console.log('✅ Ticket events for audit trail');
    
    console.log('\n🔗 Next steps:');
    console.log('1. Check your database: npx prisma studio');
    console.log('2. Start your server: npm run dev');
    console.log('3. Login with Mellon admin credentials');
    console.log('4. View tickets and their attachments');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
