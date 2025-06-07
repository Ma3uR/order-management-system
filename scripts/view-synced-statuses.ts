'use server'

import pb, { authenticatedCall } from '@/app/lib/pocketbase';

// Source mappings for display
const SOURCE_NAMES: Record<string, string> = {
  'pj9sejm9vqtu8xq': 'Epicentr',
  'gfzk8nxfokgu9ku': 'Prom.ua',
  '4tvf116a5aitwmb': 'Rozetka'
};

interface StatusRecord {
  id: string;
  name: string;
  color: string;
  priority: number;
  marketplace_code?: string | number;
  source?: string;
  created: string;
  updated: string;
}

async function getAllStatuses(): Promise<StatusRecord[]> {
  try {
    console.log('📊 Fetching all status records from database...');
    
    const records = await authenticatedCall(async () => {
      return await pb.collection('status_options').getFullList<StatusRecord>({
        sort: 'source,priority'
      });
    });

    return records;
  } catch (error) {
    console.error('❌ Failed to fetch status records:', error);
    return [];
  }
}

function formatStatusData(statuses: StatusRecord[]): void {
  console.log('\n📋 **MARKETPLACE STATUSES SYNC REPORT**');
  console.log('═'.repeat(80));

  // Group by source
  const groupedStatuses: Record<string, StatusRecord[]> = {};
  const orphanStatuses: StatusRecord[] = [];

  statuses.forEach(status => {
    if (status.source && SOURCE_NAMES[status.source]) {
      if (!groupedStatuses[status.source]) {
        groupedStatuses[status.source] = [];
      }
      groupedStatuses[status.source].push(status);
    } else {
      orphanStatuses.push(status);
    }
  });

  // Display by marketplace
  Object.entries(groupedStatuses).forEach(([sourceId, sourceStatuses]) => {
    const sourceName = SOURCE_NAMES[sourceId];
    console.log(`\n🏪 **${sourceName.toUpperCase()}** (${sourceId})`);
    console.log('─'.repeat(50));
    console.log(`📊 Total Statuses: ${sourceStatuses.length}`);
    console.log('');

    sourceStatuses.forEach((status, index) => {
      const createdDate = new Date(status.created).toLocaleString();
      const updatedDate = new Date(status.updated).toLocaleString();
      const isRecent = new Date(status.updated).getTime() > Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
      const recentFlag = isRecent ? '🆕' : '  ';
      
      console.log(`${recentFlag} ${index + 1}. ${status.name}`);
      console.log(`    🏷️  ID: ${status.id}`);
      console.log(`    🔢 Marketplace Code: ${status.marketplace_code || 'N/A'}`);
      console.log(`    🎨 Color: ${status.color}`);
      console.log(`    📈 Priority: ${status.priority}`);
      console.log(`    📅 Created: ${createdDate}`);
      console.log(`    🔄 Updated: ${updatedDate}`);
      console.log('');
    });
  });

  // Display orphan statuses (no source)
  if (orphanStatuses.length > 0) {
    console.log('\n🔍 **STATUSES WITHOUT SOURCE**');
    console.log('─'.repeat(50));
    console.log(`📊 Total: ${orphanStatuses.length}`);
    console.log('');

    orphanStatuses.forEach((status, index) => {
      const createdDate = new Date(status.created).toLocaleString();
      console.log(`  ${index + 1}. ${status.name}`);
      console.log(`    🏷️  ID: ${status.id}`);
      console.log(`    🎨 Color: ${status.color}`);
      console.log(`    📈 Priority: ${status.priority}`);
      console.log(`    📅 Created: ${createdDate}`);
      console.log('');
    });
  }

  // Summary statistics
  console.log('\n📈 **SYNC SUMMARY**');
  console.log('═'.repeat(50));
  console.log(`🏪 Epicentr: ${groupedStatuses['pj9sejm9vqtu8xq']?.length || 0} statuses`);
  console.log(`🛒 Prom.ua: ${groupedStatuses['gfzk8nxfokgu9ku']?.length || 0} statuses`);
  console.log(`🌹 Rozetka: ${groupedStatuses['4tvf116a5aitwmb']?.length || 0} statuses`);
  console.log(`🔍 No Source: ${orphanStatuses.length} statuses`);
  console.log(`📊 **TOTAL: ${statuses.length} statuses**`);
  console.log('═'.repeat(50));

  // Recent activity
  const recentStatuses = statuses.filter(s => 
    new Date(s.updated).getTime() > Date.now() - (24 * 60 * 60 * 1000)
  );
  
  if (recentStatuses.length > 0) {
    console.log(`\n🆕 **RECENT ACTIVITY (Last 24 hours): ${recentStatuses.length} statuses**`);
    recentStatuses.forEach(status => {
      const sourceName = status.source ? SOURCE_NAMES[status.source] || 'Unknown' : 'No Source';
      const updatedTime = new Date(status.updated).toLocaleString();
      console.log(`   • ${status.name} (${sourceName}) - ${updatedTime}`);
    });
  }
}

export async function viewSyncedStatuses(): Promise<void> {
  console.log('🚀 Starting status logs retrieval...');
  
  try {
    const statuses = await getAllStatuses();
    
    if (statuses.length === 0) {
      console.log('❌ No status records found in database.');
      return;
    }

    formatStatusData(statuses);
    
  } catch (error) {
    console.error('❌ Failed to retrieve status logs:', error);
    throw error;
  }
}

// Main function to run the status viewer
async function main() {
  try {
    await viewSyncedStatuses();
    console.log('\n✅ Status logs retrieval completed successfully!');
  } catch (error) {
    console.error('❌ Status logs retrieval failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export default main;

// Execute when run directly
main().catch(console.error); 