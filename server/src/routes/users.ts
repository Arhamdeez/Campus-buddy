import express from 'express';
import { db } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { User, ApiResponse, PaginatedResponse } from '../../../shared/types';

const router = express.Router();

// Get all users (with pagination)
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const batch = req.query.batch as string;
    const role = req.query.role as string;

    let query = db.collection('users');

    // Apply filters
    if (batch) {
      query = query.where('batch', '==', batch);
    }
    if (role) {
      query = query.where('role', '==', role);
    }

    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const usersSnapshot = await query.offset(offset).limit(limit).get();

    const users: User[] = [];
    usersSnapshot.forEach(doc => {
      users.push(doc.data() as User);
    });

    const response: PaginatedResponse<User> = {
      data: users,
      total,
      page,
      limit,
      hasMore: offset + limit < total
    };

    res.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<User>>);

  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    } as ApiResponse<null>);
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>);
      return;
    }

    const userData = userDoc.data() as User;

    res.json({
      success: true,
      data: userData
    } as ApiResponse<User>);

  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    } as ApiResponse<null>);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      } as ApiResponse<null>);
      return;
    }

    const { name, profilePicture } = req.body;
    const updateData: Partial<User> = {};

    if (name) updateData.name = name;
    if (profilePicture) updateData.profilePicture = profilePicture;

    await db.collection('users').doc(req.user.id).update(updateData);

    // Get updated user data
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data() as User;

    res.json({
      success: true,
      data: userData
    } as ApiResponse<User>);

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    } as ApiResponse<null>);
  }
});

// Get user leaderboard
router.get('/leaderboard/points', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const usersSnapshot = await db.collection('users')
      .orderBy('points', 'desc')
      .limit(limit)
      .get();

    const users: User[] = [];
    usersSnapshot.forEach(doc => {
      users.push(doc.data() as User);
    });

    res.json({
      success: true,
      data: users
    } as ApiResponse<User[]>);

  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    } as ApiResponse<null>);
  }
});

// Search users
router.get('/search/:query', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Simple search by name (in a real app, you'd use a search service like Algolia)
    const usersSnapshot = await db.collection('users')
      .where('name', '>=', query)
      .where('name', '<=', query + '\uf8ff')
      .limit(limit)
      .get();

    const users: User[] = [];
    usersSnapshot.forEach(doc => {
      users.push(doc.data() as User);
    });

    res.json({
      success: true,
      data: users
    } as ApiResponse<User[]>);

  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    } as ApiResponse<null>);
  }
});

export default router;
