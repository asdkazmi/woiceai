import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

async function testLogin() {
  try {
    const email = 'xyz@mail.com';
    const password = '12345678';

    // Find user with password
    const user = await User.findByEmail(email, true);
    
    if (!user || !user.password) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    // Test password comparison
    const isValid = await User.comparePassword(password, user.password);
    
    if (isValid) {
      console.log('✅ Login test successful!');
      console.log('   Email:', user.email);
      console.log('   Password matches: Yes');
      console.log('   User can login to the dashboard');
    } else {
      console.log('❌ Password does not match!');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error testing login:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testLogin();

