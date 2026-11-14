import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extend Express Request to include our custom user type
// We use intersection type to override the user property
export interface AuthRequest extends Request {
  user?: IUser;
}

// Helper function to get user from request with proper typing
export const getUser = (req: Request): IUser | undefined => {
  return (req as AuthRequest).user;
};

export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
    const user = await User.findById(parseInt(decoded.userId));

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Use type assertion to set user on request
    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
