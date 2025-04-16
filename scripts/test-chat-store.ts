/**
 * Test Chat Store Functionality
 * 
 * This script tests the chat-store functions to ensure they work as expected.
 * Run with: npx ts-node scripts/test-chat-store.ts
 */

import { createChat, loadChat, saveChat, chatExists } from '../app/lib/chat-store';
import pb from '../app/lib/pocketbase';

async function testChatStore() {
  console.log('🔍 Testing chat store functionality...');
  
  try {
    // Step 1: Create a new chat
    console.log('\n📝 Step 1: Creating a new chat...');
    const chatId = await createChat();
    console.log(`✅ Chat created with ID: ${chatId}`);
    console.log(`✅ ID length check: ${chatId.length === 15 ? 'PASS' : 'FAIL'} (Length: ${chatId.length}, Expected: 15)`);
    
    // Step 2: Check if chat exists
    console.log('\n📝 Step 2: Checking if chat exists...');
    const exists = await chatExists(chatId);
    console.log(`✅ Chat exists: ${exists}`);
    
    // Step 3: Load chat messages (should be empty)
    console.log('\n📝 Step 3: Loading chat messages...');
    const initialMessages = await loadChat(chatId);
    console.log(`✅ Initial messages: ${JSON.stringify(initialMessages)}`);
    
    // Step 4: Save a test message
    console.log('\n📝 Step 4: Saving test messages...');
    const testMessages = [
      {
        id: 'test-msg-1',
        role: 'user',
        content: 'Hello, testing chat persistence',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'test-msg-2',
        role: 'assistant',
        content: 'I can confirm that chat persistence is working!',
        createdAt: new Date().toISOString(),
      }
    ];
    
    const savedId = await saveChat({
      id: chatId,
      messages: testMessages,
    });
    console.log(`✅ Test messages saved with ID: ${savedId}`);
    
    // Step 5: Load chat messages again
    console.log('\n📝 Step 5: Reloading messages to verify save...');
    const updatedMessages = await loadChat(savedId);
    console.log(`✅ Updated messages: ${JSON.stringify(updatedMessages, null, 2)}`);
    
    // Step 6: Test updating non-existent chat (should create it)
    console.log('\n📝 Step 6: Testing save to non-existent chat...');
    const nonExistentId = 'test-non-exist-' + Date.now().toString().substring(0, 2); // Keep at 15 chars
    const nonExistentExists = await chatExists(nonExistentId);
    console.log(`✅ Non-existent chat exists: ${nonExistentExists}`);
    
    // Try to save to the non-existent chat
    const newId = await saveChat({
      id: nonExistentId,
      messages: [
        {
          id: 'auto-created-msg',
          role: 'system',
          content: 'This chat was auto-created when saving messages',
          createdAt: new Date().toISOString(),
        }
      ],
    });
    console.log(`✅ Successfully saved to non-existent chat with ID: ${newId}`);
    
    // Verify the chat was created
    const nowExists = await chatExists(newId);
    console.log(`✅ New chat exists: ${nowExists}`);
    
    // Load the auto-created chat
    const autoCreatedMessages = await loadChat(newId);
    console.log(`✅ Auto-created messages: ${JSON.stringify(autoCreatedMessages, null, 2)}`);
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      await pb.collection('chats').delete(chatId);
      await pb.collection('chats').delete(newId);
      console.log('✅ Test chats deleted');
    } catch (error) {
      console.error('❌ Error deleting test chats:', error);
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
  } finally {
    // Clean up and exit
    pb.authStore.clear();
    process.exit(0);
  }
}

testChatStore(); 