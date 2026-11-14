import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import { ConnectorService } from '../services/connectorService';

// Configure Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists with this Google ID
          const existingUser = await User.findByEmail(profile.emails?.[0]?.value || '');
          
          if (existingUser) {
            // User exists, return user
            return done(null, existingUser);
          }

          // Create new user with Google account (no password for OAuth users)
          const newUser = await User.create({
            firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
            lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
            email: profile.emails?.[0]?.value || '',
            // Omit password property - OAuth users don't have passwords
            planId: null,
          });

          // Ensure qwen model is active for new user
          await ConnectorService.ensureQwenModelActive(newUser.id!);

          return done(null, newUser);
        } catch (error: any) {
          console.error('Error in Google OAuth strategy:', error);
          return done(error, undefined);
        }
      }
    )
  );
  console.log('✅ Google OAuth strategy configured');
} else {
  console.log('⚠️  Google OAuth credentials not found. Google Sign-In will be disabled.');
  console.log('   To enable, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

