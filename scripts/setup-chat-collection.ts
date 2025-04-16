/**
 * Setup Chat Collection for PocketBase
 * 
 * This script creates the 'chats' collection in PocketBase with the required schema.
 * Run with: npx ts-node scripts/setup-chat-collection.ts
 */

import pb, { authenticatedCall } from '../app/lib/pocketbase';

async function createChatCollection() {
  try {
    // Check if collection already exists
    const collections = await authenticatedCall(async () => {
      return await pb.collections.getList(1, 50, {
        filter: 'name = "chats"'
      });
    });
    
    if (collections.items.length > 0) {
      console.log('Chats collection already exists');
      return;
    }
    
    // Create the collection
    await authenticatedCall(async () => {
      return await pb.collections.create({
        name: 'chats',
        type: 'base',
        schema: [
          {
            name: 'messages',
            type: 'json',
            required: true,
            options: {
              // These options are important for proper JSON handling
              min: 2, // Minimum length of a valid JSON (empty array "[]")
            }
          },
          {
            name: 'created',
            type: 'date',
            required: true,
          },
          {
            name: 'updated',
            type: 'date',
            required: true,
          },
          // Optional: Add user relation for future use
          // {
          //   name: 'user',
          //   type: 'relation',
          //   options: {
          //     collectionId: 'users',
          //     cascadeDelete: false,
          //   }
          // }
        ]
      });
    });
    
    console.log('Successfully created chats collection');
    
    // Create API rules for the collection
    await authenticatedCall(async () => {
      const chatCollection = await pb.collections.getOne('chats');
      
      // Set permissions
      await pb.collections.update(chatCollection.id, {
        listRule: '', // Admin only by default
        viewRule: '', // Admin only by default
        createRule: '', // Admin only by default
        updateRule: '', // Admin only by default
        deleteRule: '', // Admin only by default
      });
      
      console.log('Updated collection permissions');
    });
    
  } catch (error) {
    console.error('Error creating chats collection:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  } finally {
    // Close the connection
    pb.authStore.clear();
    process.exit(0);
  }
}

createChatCollection(); 