import express from 'express';
import { User, ApiResponse } from '../../../shared/types';
import { auth, db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRegisterInput } from '../middleware/validation';

const router = express.Router();

// Complete registration - set custom claims and update user data
// This is called after the client creates the user with Firebase Auth
router.post('/register-complete', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { batch, name } = req.body;

    if (!batch || !name) {
      res.status(400).json({
        success: false,
        error: 'Batch and name are required'
      } as ApiResponse<null>);
      return;
    }

    // Set custom claims
    await auth.setCustomUserClaims(req.user.id, {
      batch,
      role: 'student'
    });

    // Update user document in Firestore
    await db.collection('users').doc(req.user.id).update({
      batch,
      name,
      updatedAt: new Date(),
    });

    // Get updated user data
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data() as User;

    res.json({
      success: true,
      data: userData
    } as ApiResponse<User>);

  } catch (error: any) {
    console.error('Registration completion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete registration'
    } as ApiResponse<null>);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    // User is already attached to request by authenticateToken middleware
    res.json({
      success: true,
      data: req.user
    } as ApiResponse<User>);

  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    } as ApiResponse<null>);
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    // Firebase handles logout client-side
    // This endpoint is just for consistency
    res.json({
      success: true,
      message: 'Logged out successfully'
    } as ApiResponse<null>);

  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    } as ApiResponse<null>);
  }
});

export default router;
