#!/usr/bin/env tsx

import pb, { authenticatedCall } from '@/app/lib/pocketbase';

interface StatusRecord {
  id: string;
  name: string;
  marketplace_code?: string;
  color: string;
  priority: number;
  source?: string;
}

async function fixCompletedStatusCodes() {
  console.log('🚀 Starting completed status marketplace codes verification...');
  
  try {
    // Authenticate as admin
    await authenticatedCall(async () => {
      // Get all status records
      const statuses = await pb.collection('status_options').getFullList<StatusRecord>({
        sort: 'name'
      });

      console.log(`📊 Found ${statuses.length} status records`);

      // Find statuses that should be considered "completed"
      const completedStatuses = statuses.filter(status => {
        const code = status.marketplace_code?.toLowerCase();
        const name = status.name?.toLowerCase();
        
        return (
          code === '6' || 
          code === 'completed' || 
          code === 'delivered' ||
          name?.includes('completed') ||
          name?.includes('delivered') ||
          name?.includes('виконано') || // Ukrainian for "completed"
          name?.includes('доставлено') // Ukrainian for "delivered"
        );
      });

      console.log(`\n🎯 Found ${completedStatuses.length} statuses that represent completed orders:`);
      
      completedStatuses.forEach((status, index) => {
        console.log(`  ${index + 1}. "${status.name}" (ID: ${status.id})`);
        console.log(`     Current marketplace_code: "${status.marketplace_code || 'N/A'}"`);
        console.log(`     Source: ${status.source || 'N/A'}`);
      });

      // Update statuses that don't have the correct marketplace_code
      const statusesToUpdate = completedStatuses.filter(status => 
        status.marketplace_code !== '6'
      );

      if (statusesToUpdate.length > 0) {
        console.log(`\n🔧 Updating ${statusesToUpdate.length} statuses to have marketplace_code = '6':`);
        
        for (const status of statusesToUpdate) {
          try {
            const updatedStatus = await pb.collection('status_options').update(status.id, {
              marketplace_code: '6'
            });
            
            console.log(`  ✅ Updated "${status.name}" (ID: ${status.id})`);
            console.log(`     Old code: "${status.marketplace_code || 'N/A'}" → New code: "6"`);
          } catch (error) {
            console.error(`  ❌ Failed to update "${status.name}" (ID: ${status.id}):`, error);
          }
        }
      } else {
        console.log('\n✅ All completed statuses already have the correct marketplace_code = "6"');
      }

      // Display final summary
      console.log('\n📋 **COMPLETED STATUS SUMMARY**');
      console.log('═'.repeat(50));
      
      const finalStatuses = await pb.collection('status_options').getFullList<StatusRecord>({
        filter: 'marketplace_code = "6"',
        sort: 'name'
      });

      console.log(`🎯 Total statuses with marketplace_code = "6": ${finalStatuses.length}`);
      finalStatuses.forEach((status, index) => {
        console.log(`  ${index + 1}. "${status.name}" (ID: ${status.id})`);
      });

      return finalStatuses;
    });

  } catch (error) {
    console.error('❌ Failed to fix completed status codes:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await fixCompletedStatusCodes();
    console.log('\n✅ Completed status marketplace codes verification completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { fixCompletedStatusCodes };
export default main;
