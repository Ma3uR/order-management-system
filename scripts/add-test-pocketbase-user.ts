import { getPocketBase } from '../lib/pocketbase';
import dotenv from 'dotenv';
import { ClientResponseError } from 'pocketbase';

// Load environment variables
dotenv.config();

const pb = getPocketBase();

/**
 * Creates a test user and optionally authenticates as the created user.
 * If the user already exists, it attempts to authenticate with the existing user.
 * @returns {Promise<void>} This method doesn't return a value, but logs the results to the console.
 * @throws {Error} If there's an error creating the user or authenticating, and it's not a "user already exists" error.
 */
async function createTestUser() {
  try {
    // Create a test user
    const user = await pb.collection('users').create({
      email: 'test@example.com',
      password: 'testpassword',
      passwordConfirm: 'testpassword', // Required by PocketBase
      name: 'Test User',
      emailVisibility: true,
    });

    console.log('Test user created successfully:', user);

    // Optionally authenticate as the created user
    const authData = await pb.collection('users').authWithPassword(
      'test@example.com',
      'testpassword'
    );

    console.log('User authenticated:', authData);

  } catch (error) {
    if (error instanceof ClientResponseError && 
        error.status === 400 && 
        error.data?.data?.email?.code === 'validation_not_unique') {
      console.log('User already exists');
      
      // Try to authenticate with existing user
      try {
        const authData = await pb.collection('users').authWithPassword(
          'test@example.com',
          'testpassword'
        );
        console.log('Authenticated with existing user:', authData);
      } catch (authError) {
        console.error('Failed to authenticate:', authError);
      }
    } else {
      console.error('Error creating test user:', error);
    }
  }
}

// Run the function
createTestUser()
  .catch(console.error)
  .finally(() => {
    console.log('Script completed');
  }); 