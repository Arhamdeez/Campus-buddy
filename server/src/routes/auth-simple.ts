import express from 'express';
import jwt from 'jsonwebtoken';
import { User, RegisterRequest, LoginRequest, AuthResponse, ApiResponse } from '../../../shared/types';

const router = express.Router();

// Register new user - Mock implementation for development
router.post('/register', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { name, email, password, batch }: RegisterRequest = req.body;

    // Basic validation
    if (!name || !email || !password || !batch) {
      res.status(400).json({
        success: false,
        error: 'All fields are required'
      } as ApiResponse<null>);
      return;
    }

    // Mock implementation - just create a user object
    const userData: User = {
      id: `user_${Date.now()}`,
      name,
      email,
      batch,
      role: 'student',
      joinedAt: Date.now(),
      badges: [],
      points: 0,
    };

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = (jwt.sign as any)(
      { uid: userData.id, email: userData.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: { user: userData, token }
    } as ApiResponse<AuthResponse>);

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    } as ApiResponse<null>);
  }
});

// Login user - Mock implementation for development
router.post('/login', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Basic validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required'
      } as ApiResponse<null>);
      return;
    }

    // Mock implementation - create a mock user
    const userData: User = {
      id: `user_${Date.now()}`,
      name: 'Test User',
      email,
      batch: '22L-6619',
      role: 'student',
      joinedAt: Date.now(),
      badges: [],
      points: 100,
    };

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = (jwt.sign as any)(
      { uid: userData.id, email: userData.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: { user: userData, token }
    } as ApiResponse<AuthResponse>);

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    } as ApiResponse<null>);
  }
});

// Get current user - Mock implementation
router.get('/me', async (req: express.Request, res: express.Response) => {
  try {
    // Mock implementation - return a test user
    const userData: User = {
      id: 'current-user',
      name: 'Current User',
      email: 'user@example.com',
      batch: '22L-6619',
      role: 'student',
      joinedAt: Date.now(),
      badges: [],
      points: 150,
    };

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

export default router;
