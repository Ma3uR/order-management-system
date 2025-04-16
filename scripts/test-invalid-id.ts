/**
 * Test Invalid ID Handling
 * 
 * This script tests how the chat-store handles invalid ID lengths.
 * Run with: npx ts-node scripts/test-invalid-id.ts
 */

import { saveChat, chatExists, loadChat } from '../app/lib/chat-store';
import pb from '../app/lib/pocketbase';

async function testInvalidIds() {
  console.log('🔍 Testing invalid ID handling...');
  
  const testCases = [
    { id: 'too-short', expected: 'invalid', description: 'Too short ID' },
    { id: 'this-is-way-too-long-for-pocketbase', expected: 'invalid', description: 'Too long ID' },
    { id: '123456789012345', expected: 'valid', description: 'Exactly 15 characters (valid)' }
  ];
  
  const createdIds = [];
  
  try {
    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.description} (${testCase.id})`);
      console.log(`ID length: ${testCase.id.length}, Expected: ${testCase.expected === 'valid' ? 'valid (no change)' : 'invalid (will change)'}`);
      
      // Try to save a chat with this ID
      const savedId = await saveChat({
        id: testCase.id,
        messages: [
          {
            id: `msg-${testCase.id}`,
            role: 'system',
            content: `Test message for ID: ${testCase.id}`,
            createdAt: new Date().toISOString(),
          }
        ],
      });
      
      createdIds.push(savedId);
      
      // Check if ID changed
      if (savedId === testCase.id) {
        console.log(`✅ ID unchanged: ${savedId}`);
        console.log(`Result: ${testCase.expected === 'valid' ? 'PASS' : 'FAIL - Expected ID to change'}`);
      } else {
        console.log(`⚠️ ID changed: ${testCase.id} -> ${savedId}`);
        console.log(`Result: ${testCase.expected === 'invalid' ? 'PASS' : 'FAIL - Expected ID to remain the same'}`);
      }
      
      // Verify the chat exists with the new ID
      const exists = await chatExists(savedId);
      console.log(`✅ Chat exists with ID ${savedId}: ${exists}`);
      
      // Load the messages
      const messages = await loadChat(savedId);
      console.log(`✅ Messages: ${JSON.stringify(messages, null, 2)}`);
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    for (const id of createdIds) {
      try {
        await pb.collection('chats').delete(id);
        console.log(`✅ Deleted chat: ${id}`);
      } catch (error) {
        console.error(`❌ Error deleting chat ${id}:`, error);
      }
    }
    
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
    pb.authStore.clear();
    process.exit(0);
  }
}

testInvalidIds(); 