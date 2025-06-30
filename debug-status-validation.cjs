const PocketBase = require('pocketbase').default;

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

// Regex from the validation schema
const STATUS_NAME_REGEX = /^[a-zA-Z0-9\u0400-\u04FF\s\-()\/\.\:]+$/;

async function checkStatusNames() {
  try {
    // Try to authenticate if needed
    if (process.env.POCKETBASE_EMAIL && process.env.POCKETBASE_PASSWORD) {
      await pb.admins.authWithPassword(process.env.POCKETBASE_EMAIL, process.env.POCKETBASE_PASSWORD);
    }

    const statuses = await pb.collection('status_options').getFullList({
      sort: 'name'
    });

    console.log(`Found ${statuses.length} statuses to check:`);
    console.log('');

    const failing = [];
    const passing = [];

    statuses.forEach((status) => {
      const isValid = STATUS_NAME_REGEX.test(status.name);
      
      if (isValid) {
        passing.push(status.name);
      } else {
        failing.push({
          name: status.name,
          source: status.source,
          chars: Array.from(status.name).filter(char => !/[a-zA-Z0-9\u0400-\u04FF\s\-()\/\.\:]/.test(char))
        });
      }
    });

    if (failing.length > 0) {
      console.log('❌ FAILING STATUS NAMES:');
      failing.forEach((status, i) => {
        console.log(`${i + 1}. "${status.name}"`);
        console.log(`   Invalid chars: ${status.chars.map(c => `"${c}" (${c.charCodeAt(0)})`).join(', ')}`);
        console.log('');
      });
    } else {
      console.log('✅ All status names are valid!');
    }

    console.log(`\n✅ Passing: ${passing.length}, ❌ Failing: ${failing.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStatusNames();