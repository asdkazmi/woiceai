import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

async function createTestUser() {
  try {
    const email = 'xyz@mail.com';
    const password = '12345678';

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('⚠️  User with email xyz@mail.com already exists!');
      console.log('   User ID:', existingUser.id);
      console.log('   Name:', existingUser.firstName, existingUser.lastName);
      return;
    }

    // Create the test user
    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: password,
      planId: null,
    });

    console.log('✅ Test user created successfully!');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('   Email:    xyz@mail.com');
    console.log('   Password: 12345678');
  } catch (error: any) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createTestUser();

