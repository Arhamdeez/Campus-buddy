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
    
    // Try to get user data from Firestore, but don't fail if unavailable
    let userData: User | null = null;
    try {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data() as User;
      }
    } catch (firestoreError: any) {
      console.warn('⚠️ Auth middleware: Firestore unavailable, using token claims');
    }
    
    // If Firestore data not available, create user from token claims
    if (!userData) {
      const email = decodedToken.email || '';
      const name = decodedToken.name || email.split('@')[0] || 'User';
      
      userData = {
        id: decodedToken.uid,
        name: name,
        email: email,
        batch: '',
        role: 'student',
        joinedAt: Date.now(),
        badges: [],
        points: 0,
        profilePicture: decodedToken.picture || undefined,
      };
      
      console.log('✅ Auth middleware: Created user from token claims');
    }
    
    // Attach user to request
    req.user = userData;

    next();
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else if (error.code === 'auth/id-token-revoked') {
      res.status(401).json({ success: false, error: 'Token revoked' });
    } else if (error.code === 'auth/argument-error') {
      res.status(401).json({ success: false, error: 'Invalid token format' });
    } else {
      res.status(403).json({ success: false, error: `Authentication failed: ${error.message || 'Unknown error'}` });
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
