import pb, { authenticatedCall } from '@/app/lib/pocketbase';

const ROZETKA_SOURCE_ID = '4tvf116a5aitwmb';

async function addMissingStatus61() {
  try {
    console.log('🔍 Checking if Rozetka status 61 exists in database...');
    
    // Check if status 61 already exists
    const existingStatus = await authenticatedCall(() =>
      pb.collection('status_options').getList(1, 10, {
        filter: `source = "${ROZETKA_SOURCE_ID}" && marketplace_code = "61"`
      })
    );

    if (existingStatus.items.length > 0) {
      console.log('✅ Status 61 already exists:', existingStatus.items[0]);
      return { success: true, action: 'already_exists', status: existingStatus.items[0] };
    }

    console.log('➕ Creating missing Rozetka status 61...');
    
    // Create the missing status based on what we found in the order
    const newStatus = await authenticatedCall(() =>
      pb.collection('status_options').create({
        name: 'Заплановано передачу перевізникові',
        color: '#221F1F', // Same color as other delivery-related statuses
        priority: 50, // Put it after the existing statuses
        marketplace_code: '61',
        source: ROZETKA_SOURCE_ID
      })
    );

    console.log('✅ Successfully created missing status 61:', newStatus);
    return { success: true, action: 'created', status: newStatus };

  } catch (error) {
    console.error('❌ Failed to add missing status 61:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function main() {
  const result = await addMissingStatus61();
  
  if (result.success) {
    console.log(`🎉 Status 61 handling completed: ${result.action}`);
    
    if (result.action === 'created') {
      console.log('🚀 Now you can run the order sync again and orders with status 61 should be processed!');
    }
  } else {
    console.error('❌ Failed to handle status 61:', result.error);
  }
  
  return result;
}

// Execute when script is run directly
main().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});