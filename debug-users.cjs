const { default: PocketBase } = require('pocketbase');
require('dotenv').config({ path: '.env.local' });

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function debugUsers() {
  console.log('🔍 Debugging users in PocketBase...');
  console.log('📍 PocketBase URL:', POCKETBASE_URL);

  const pb = new PocketBase(POCKETBASE_URL);

  try {
    // Authenticate as admin
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin authentication successful');

    // Check users collection
    console.log('\n👥 Checking users collection...');
    const users = await pb.collection('users').getFullList({
      sort: '-created',
    });
    console.log(`📊 Found ${users.length} users in 'users' collection:`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || user.email} (${user.email}) - Role: ${user.role || 'no role'} - Plan: ${user.plan || 'no plan'}`);
    });

    // Check admin users
    console.log('\n🛡️  Checking admin users...');
    const admins = await pb.admins.getFullList();
    console.log(`📊 Found ${admins.length} admin users:`);
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.email} (ID: ${admin.id})`);
    });

    // Total count
    console.log(`\n📈 Total users that should appear in UI: ${users.length + admins.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUsers().catch(console.error);
