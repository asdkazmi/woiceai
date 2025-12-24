import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import passport from '../config/googleAuth';
import User, { IUser } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ConnectorService } from '../services/connectorService';

const router = express.Router();

// Generate JWT Token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { firstName, lastName, email, password, planId } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          message: 'User with this email already exists',
        });
      }

      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        planId: planId || null,
      });

      // Ensure qwen model is active for new user
      await ConnectorService.ensureQwenModelActive(user.id!);

      // Generate token
      const token = generateToken(user.id!.toString());

      res.status(201).json({
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            planId: user.planId,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: 'Server error during registration',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findByEmail(email, true);
      if (!user || !user.password) {
        return res.status(401).json({
          message: 'Invalid email or password',
        });
      }

      // Check password
      const isPasswordValid = await User.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: 'Invalid email or password',
        });
      }

      // Ensure qwen model is active for user
      await ConnectorService.ensureQwenModelActive(user.id!);

      // Generate token
      const token = generateToken(user.id!.toString());

      res.json({
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            planId: user.planId,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'Server error during login',
        ...(process.env.NODE_ENV === 'development' && { error: error.message }),
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req: any, res: Response) => {
  try {
    const user = req.user as IUser;
    res.json({
      message: 'User fetched successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          planId: user.planId,
        },
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, async (req: any, res: Response) => {
  try {
    // In a JWT system, logout is typically handled client-side by removing the token
    // If you need server-side logout, implement token blacklisting
    res.json({
      message: 'Logout successful',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
});

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth login
// @access  Public
router.get(
  '/google',
  (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.',
      });
    }
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }
    next();
  },
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=authentication_failed`
  }),
  async (req: any, res: Response) => {
    try {
      console.log('🔵 Google OAuth callback received');
      const user = req.user as IUser | undefined;
      
      if (!user || !user.id) {
        console.error('❌ No user in request after Google authentication');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=authentication_failed`);
      }

      console.log('✅ Google OAuth successful for user:', user.email, 'ID:', user.id);

      // Ensure qwen model is active for user
      await ConnectorService.ensureQwenModelActive(user.id);

      // Generate JWT token
      const token = generateToken(user.id.toString());

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
      
      console.log('🔄 Redirecting to frontend:', redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('❌ Google OAuth callback error:', error);
      console.error('Error stack:', error.stack);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=authentication_failed`);
    }
  }
);

export default router;

