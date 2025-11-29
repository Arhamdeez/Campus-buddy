import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/database';
import { User } from '../../../shared/types';

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, error: 'Access token required' });
      return;
    }

    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user from Firebase Auth
    const userRecord = await auth.getUser(decodedToken.uid);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ success: false, error: 'User data not found' });
      return;
    }
    
    const userData = userDoc.data() as User;
    
    // Attach user to request
    req.user = userData;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else if (error.code === 'auth/id-token-revoked') {
      res.status(401).json({ success: false, error: 'Token revoked' });
    } else {
      res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
