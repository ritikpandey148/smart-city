// backend/seed.js
// Creates Admin + myBMC provider accounts

const bcrypt = require('bcrypt');
const db = require('./db');

const SALT_ROUNDS = 10;

async function seed() {
  try {
    console.log('🌱 Starting seed...');

    // ADMIN
    const adminUsername = 'Admin1234@';
    const adminHash = await bcrypt.hash('Admin1234@', SALT_ROUNDS);
    const [adminRows] = await db.query(
      'SELECT id FROM users WHERE username = ?', [adminUsername]
    );

    if (adminRows.length === 0) {
      await db.query(
        `INSERT INTO users 
         (first_name, last_name, username, password_hash, role, account_status)
         VALUES (?, ?, ?, ?, 'admin', 'active')`,
        ['Super', 'Admin', adminUsername, adminHash]
      );
      console.log('✅ Admin account created:', adminUsername);
    } else {
      await db.query(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [adminHash, adminUsername]
      );
      console.log('ℹ️  Admin exists — password hash refreshed');
    }

    // PROVIDER (myBMC)
    const providerUsername = 'mybmc@400';
    const providerHash = await bcrypt.hash('mybmc@400', SALT_ROUNDS);
    const [provRows] = await db.query(
      'SELECT id FROM service_providers WHERE username = ?', [providerUsername]
    );

    if (provRows.length === 0) {
      await db.query(
        `INSERT INTO service_providers
         (name, username, password_hash, category, locality, account_status)
         VALUES (?, ?, ?, 'all', 'Mumbai', 'active')`,
        ['myBMC Mumbai', providerUsername, providerHash]
      );
      console.log('✅ myBMC provider created:', providerUsername);
    } else {
      await db.query(
        'UPDATE service_providers SET password_hash = ? WHERE username = ?',
        [providerHash, providerUsername]
      );
      console.log('ℹ️  Provider exists — password hash refreshed');
    }

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();