import PocketBase from 'pocketbase';

// Initialize PocketBase client
const pb = new PocketBase('http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io');

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
    if (error?.status === 400 && error?.data?.data?.email?.code === 'validation_not_unique') {
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