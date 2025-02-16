import pb from '../app/lib/pocketbase';

async function migrateMarketplaceIds() {
  const orders = await pb.collection('orders').getFullList();
  
  for (const order of orders) {
    if (order.marketplaceId) {
      await pb.collection('orders').update(order.id, {
        marketplaceIds: order.marketplaceId,
        marketplaceId: null
      });
    }
  }
  
  console.log('Migration completed!');
}

migrateMarketplaceIds(); 